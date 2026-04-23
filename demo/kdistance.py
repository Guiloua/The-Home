from manimlib import *


def create_axes_and_grid():
    """创建网格和坐标轴（统一尺寸）"""
    axes = Axes(
        x_range=(-12, 12, 1),
        y_range=(-7, 7, 1),
        height=14,
        width=24,
        axis_config={
            "stroke_color": GREY_A,
            "stroke_width": 2,
        },
    )
    axes.add_coordinate_labels(font_size=20)

    grid = NumberPlane(
        x_range=(-12, 12, 1),
        y_range=(-7, 7, 1),
        width=24,
        height=14,
        faded_line_ratio=0,
    )
    grid.background_lines.set_stroke(color=GREY_D, width=1)

    return grid, axes


def get_unit_length(axes):
    """获取坐标轴1单位对应的manim长度"""
    p1 = axes.c2p(0, 0)
    p2 = axes.c2p(1, 0)
    return np.linalg.norm(p2 - p1)


# ==================== Scene 1: 呈现坐标轴，直线y=x ====================
class KDistanceScene1(Scene):
    def construct(self):
        grid, axes = create_axes_and_grid()

        self.play(Write(grid, lag_ratio=0.001, run_time=1))
        self.play(Write(axes, lag_ratio=0.01, run_time=1))

        # 直线y=x
        y_eq_x = axes.get_graph(
            lambda x: x,
            x_range=(-8, 8),
            color=BLUE,
            stroke_width=2
        )
        y_eq_x_label = axes.get_graph_label(y_eq_x, 'y=x')

        self.play(
            ShowCreation(y_eq_x),
            FadeIn(y_eq_x_label, RIGHT)
        )
        self.wait(2)


# ==================== Scene 2: 呈现圆心C和三角形PQR，C在x=s上移动，PQR旋转 ====================
class KDistanceScene2(Scene):
    def construct(self):
        grid, axes = create_axes_and_grid()
        self.add(grid, axes)

        y_eq_x = axes.get_graph(
            lambda x: x,
            x_range=(-8, 8),
            color=BLUE,
            stroke_width=2
        )
        y_eq_x_label = axes.get_graph_label(y_eq_x, 'y=x')
        self.add(y_eq_x, y_eq_x_label)

        self.wait(0.5)

        # 摄像机拉远，以便看到PQR的完整移动范围
        self.play(
            self.camera.frame.animate.scale(1.8),
            run_time=1
        )

        unit_length = get_unit_length(axes)

        # x=s直线
        x_eq_s = DashedLine(
            start=axes.c2p(0, -7),
            end=axes.c2p(0, 7),
            color=PURPLE,
            stroke_width=2
        )
        x_s_label = Text("x = s", font_size=24, color=PURPLE)
        x_s_label.next_to(x_eq_s, UP + RIGHT)

        self.play(
            ShowCreation(x_eq_s),
            FadeIn(x_s_label, RIGHT)
        )

        # 使用ValueTracker跟踪y坐标变化
        y_tracker = ValueTracker(-6)
        unit_len = unit_length

        def get_center():
            return axes.c2p(0, y_tracker.get_value())

        # 圆心点和标签（使用updater）
        center_dot_c1 = Dot(color=WHITE, radius=0.08)
        center_dot_c1.add_updater(lambda m: m.move_to(get_center()))

        center_label_c1 = Text("C", font_size=24, color=BLUE)
        center_label_c1.add_updater(lambda m: m.next_to(get_center(), UP, buff=0.1))

        # 三角形顶点的相对坐标
        def get_triangle_points(angle_offset=0):
            center = get_center()
            angles = [PI/2 + angle_offset, PI/2 + 2*PI/3 + angle_offset, PI/2 + 4*PI/3 + angle_offset]
            return [center + unit_len * np.array([np.cos(a), np.sin(a), 0]) for a in angles]

        # 三角形
        triangle = Polygon(*get_triangle_points(0))
        triangle.set_stroke(RED, width=2)

        # 顶点标签
        vertex_labels = VGroup()
        labels = ["P", "Q", "R"]
        directions = [UP, DL, DR]
        for i, (label, direction) in enumerate(zip(labels, directions)):
            txt = Text(label, font_size=20, color=RED)
            vertex_labels.add(txt)

        # 添加updater使三角形随y移动和旋转
        angle_tracker = ValueTracker(0)

        def update_triangle(m):
            points = get_triangle_points(angle_tracker.get_value())
            m.set_points_as_corners([*points, points[0]])

        triangle.add_updater(update_triangle)

        def update_labels(mob):
            points = get_triangle_points(angle_tracker.get_value())
            for i, direction in enumerate(directions):
                mob[i].next_to(points[i], direction * 0.3)

        vertex_labels.add_updater(update_labels)

        self.add(triangle, vertex_labels, center_dot_c1, center_label_c1)
        self.wait(1)

        # 从y=-6移动到y=6，同时旋转
        self.play(
            y_tracker.animate.set_value(6),
            angle_tracker.animate.increment_value(2*PI),
            run_time=5
        )

        self.wait(0.5)

        # 从y=6移动到y=1，同时旋转
        self.play(
            y_tracker.animate.set_value(1),
            angle_tracker.animate.increment_value(-PI),
            run_time=3
        )

        # 移除updater，保留最终状态
        triangle.clear_updaters()
        vertex_labels.clear_updaters()
        center_dot_c1.clear_updaters()
        center_label_c1.clear_updaters()

        self.wait(2)


# ==================== Scene 3: PQR旋转一周后，呈现圆c1 ====================
class KDistanceScene3(Scene):
    def construct(self):
        grid, axes = create_axes_and_grid()
        self.add(grid, axes)

        y_eq_x = axes.get_graph(
            lambda x: x,
            x_range=(-8, 8),
            color=BLUE,
            stroke_width=2
        )
        y_eq_x_label = axes.get_graph_label(y_eq_x, 'y=x')
        self.add(y_eq_x, y_eq_x_label)

        x_eq_s = DashedLine(
            start=axes.c2p(0, -7),
            end=axes.c2p(0, 7),
            color=PURPLE,
            stroke_width=2
        )
        x_s_label = Text("x = s", font_size=24, color=PURPLE)
        x_s_label.next_to(x_eq_s, UP + RIGHT)
        self.add(x_eq_s, x_s_label)

        # 先拉远摄像机，与Scene2结束状态一致
        self.camera.frame.scale(1.8)

        self.wait(0.5)

        # 摄像机拉近，回到正常视角
        self.play(
            self.camera.frame.animate.scale(1/1.8),
            run_time=1
        )

        self.wait(0.5)

        unit_length = get_unit_length(axes)
        center_c1 = axes.c2p(0, 1)

        # 三角形PQR（Scene2结束时已经旋转了π）
        initial_angle = PI
        triangle_vertices = [
            center_c1 + unit_length * np.array([np.cos(PI/2 + initial_angle), np.sin(PI/2 + initial_angle), 0]),
            center_c1 + unit_length * np.array([np.cos(PI/2 + 2*PI/3 + initial_angle), np.sin(PI/2 + 2*PI/3 + initial_angle), 0]),
            center_c1 + unit_length * np.array([np.cos(PI/2 + 4*PI/3 + initial_angle), np.sin(PI/2 + 4*PI/3 + initial_angle), 0])
        ]
        triangle = Polygon(*triangle_vertices)
        triangle.set_stroke(RED, width=2)

        labels = ["P", "Q", "R"]
        directions = [UP, DL, DR]
        vertex_labels = VGroup()
        for vertex, label, direction in zip(triangle_vertices, labels, directions):
            txt = Text(label, font_size=20, color=RED)
            txt.next_to(vertex, direction * 0.3)
            vertex_labels.add(txt)

        center_dot_c1 = Dot(center_c1, color=WHITE, radius=0.08)
        center_label_c1 = Text("C", font_size=24, color=BLUE)
        center_label_c1.next_to(center_dot_c1, UP, buff=0.1)

        self.add(triangle, vertex_labels, center_dot_c1, center_label_c1)

        self.wait(1)

        # 旋转一周
        all_triangle_objects = VGroup(triangle, vertex_labels)
        self.play(
            Rotate(all_triangle_objects, angle=2*PI, about_point=center_c1, run_time=4)
        )

        self.wait(1)

        # 呈现圆c1
        c1 = Circle(radius=unit_length)
        c1.set_stroke(BLUE, width=2)
        c1.move_to(center_c1)
        c1_label = Text("c1", font_size=24, color=BLUE)
        c1_label.next_to(c1, LEFT, buff=0.1)

        self.play(
            ShowCreation(c1),
            FadeIn(c1_label)
        )

        self.wait(2)


# ==================== Scene 4: 呈现直线l，l在圆内左右移动，PQR旋转 ====================
class KDistanceScene4(Scene):
    def construct(self):
        grid, axes = create_axes_and_grid()
        self.add(grid, axes)

        y_eq_x = axes.get_graph(
            lambda x: x,
            x_range=(-8, 8),
            color=BLUE,
            stroke_width=2
        )
        y_eq_x_label = axes.get_graph_label(y_eq_x, 'y=x')
        self.add(y_eq_x, y_eq_x_label)

        unit_length = get_unit_length(axes)
        center_c1 = axes.c2p(0, 1)

        # 三角形PQR（已旋转π/4）
        triangle_vertices = [
            center_c1 + unit_length * np.array([np.cos(PI/2 + PI/4), np.sin(PI/2 + PI/4), 0]),
            center_c1 + unit_length * np.array([np.cos(PI/2 + 2*PI/3 + PI/4), np.sin(PI/2 + 2*PI/3 + PI/4), 0]),
            center_c1 + unit_length * np.array([np.cos(PI/2 + 4*PI/3 + PI/4), np.sin(PI/2 + 4*PI/3 + PI/4), 0])
        ]
        triangle = Polygon(*triangle_vertices)
        triangle.set_stroke(RED, width=2)

        labels = ["P", "Q", "R"]
        directions = [UP, DL, DR]
        vertex_labels = VGroup()
        for vertex, label, direction in zip(triangle_vertices, labels, directions):
            txt = Text(label, font_size=20, color=RED)
            txt.next_to(vertex, direction * 0.3)
            vertex_labels.add(txt)

        c1 = Circle(radius=unit_length)
        c1.set_stroke(BLUE, width=2)
        c1.move_to(center_c1)
        c1_label = Text("c1", font_size=24, color=BLUE)
        c1_label.next_to(c1, LEFT, buff=0.1)
        center_dot_c1 = Dot(center_c1, color=WHITE, radius=0.08)
        center_label_c1 = Text("C", font_size=24, color=BLUE)
        center_label_c1.next_to(center_dot_c1, UP, buff=0.1)

        self.add(triangle, vertex_labels, c1, c1_label, center_dot_c1, center_label_c1)

        # 呈现直线l（平行于y=x）
        # 从圆心开始，左右移动
        b_start = 1
        line_l = axes.get_graph(
            lambda x: x + b_start,
            x_range=(-6, 6),
            color=RED,
            stroke_width=2
        )
        dashed_line_l = DashedVMobject(line_l)
        l_label = Text("l", font_size=24, color=RED)
        l_label.move_to(axes.c2p(3, 3 + b_start))

        self.play(
            ShowCreation(dashed_line_l),
            FadeIn(l_label)
        )

        self.wait(1)

        # l在圆内左右移动，同时PQR旋转
        all_triangle_objects = VGroup(triangle, vertex_labels)

        # 先向上移动
        b1 = 1 + np.sqrt(2) / 2
        line1 = axes.get_graph(
            lambda x: x + b1,
            x_range=(-6, 6),
            color=RED,
            stroke_width=2
        )
        dashed_line1 = DashedVMobject(line1)

        self.play(
            ReplacementTransform(dashed_line_l, dashed_line1),
            l_label.animate.move_to(axes.c2p(3, 3 + b1)),
            Rotate(all_triangle_objects, angle=PI/3, about_point=center_c1),
            run_time=2
        )

        # 再向下移动
        b2 = 1 - np.sqrt(2) / 2
        line2 = axes.get_graph(
            lambda x: x + b2,
            x_range=(-6, 6),
            color=RED,
            stroke_width=2
        )
        dashed_line2 = DashedVMobject(line2)

        self.play(
            ReplacementTransform(dashed_line1, dashed_line2),
            l_label.animate.move_to(axes.c2p(3, 3 + b2)),
            Rotate(all_triangle_objects, angle=-2*PI/3, about_point=center_c1),
            run_time=2
        )

        self.wait(2)


# ==================== Scene 5: PQR旋转完一周，边平行于y=x，呈现l1和l2 ====================
class KDistanceScene5(Scene):
    def construct(self):
        grid, axes = create_axes_and_grid()
        self.add(grid, axes)

        y_eq_x = axes.get_graph(
            lambda x: x,
            x_range=(-8, 8),
            color=BLUE,
            stroke_width=2
        )
        y_eq_x_label = axes.get_graph_label(y_eq_x, 'y=x')
        self.add(y_eq_x, y_eq_x_label)

        unit_length = get_unit_length(axes)
        center_c1 = axes.c2p(0, 1)

        # 三角形PQR（初始）
        triangle_vertices = [
            center_c1 + unit_length * np.array([np.cos(PI/2), np.sin(PI/2), 0]),
            center_c1 + unit_length * np.array([np.cos(PI/2 + 2*PI/3), np.sin(PI/2 + 2*PI/3), 0]),
            center_c1 + unit_length * np.array([np.cos(PI/2 + 4*PI/3), np.sin(PI/2 + 4*PI/3), 0])
        ]
        triangle = Polygon(*triangle_vertices)
        triangle.set_stroke(RED, width=2)

        labels = ["P", "Q", "R"]
        directions = [UP, DL, DR]
        vertex_labels = VGroup()
        for vertex, label, direction in zip(triangle_vertices, labels, directions):
            txt = Text(label, font_size=20, color=RED)
            txt.next_to(vertex, direction * 0.3)
            vertex_labels.add(txt)

        c1 = Circle(radius=unit_length)
        c1.set_stroke(BLUE, width=2)
        c1.move_to(center_c1)
        c1_label = Text("c1", font_size=24, color=BLUE)
        c1_label.next_to(c1, LEFT, buff=0.1)
        center_dot_c1 = Dot(center_c1, color=WHITE, radius=0.08)
        center_label_c1 = Text("C", font_size=24, color=BLUE)
        center_label_c1.next_to(center_dot_c1, UP, buff=0.1)

        self.add(triangle, vertex_labels, c1, c1_label, center_dot_c1, center_label_c1)

        # PQR旋转一周
        all_triangle_objects = VGroup(triangle, vertex_labels)
        self.play(
            Rotate(all_triangle_objects, angle=2*PI, about_point=center_c1, run_time=4)
        )

        self.wait(1)

        # 最后旋转到一条边平行于y=x（π/4）
        self.play(
            Rotate(all_triangle_objects, angle=PI/4, about_point=center_c1, run_time=2)
        )

        self.wait(1)

        # 呈现l2（在这条平行边上）
        b2 = 1 - np.sqrt(2) / 2
        line2 = axes.get_graph(
            lambda x: x + b2,
            x_range=(-8, 8),
            color=RED,
            stroke_width=2
        )
        dashed_line2 = DashedVMobject(line2)
        l2_label = Text("l2", font_size=24, color=RED)
        l2_label.move_to(axes.c2p(3, 3 + b2))

        self.play(
            ShowCreation(dashed_line2),
            FadeIn(l2_label)
        )

        self.wait(1)

        # 呈现l1
        b1 = 1 + np.sqrt(2) / 2
        line1 = axes.get_graph(
            lambda x: x + b1,
            x_range=(-8, 8),
            color=RED,
            stroke_width=2
        )
        dashed_line1 = DashedVMobject(line1)
        l1_label = Text("l1", font_size=24, color=RED)
        l1_label.move_to(axes.c2p(3, 3 + b1))

        self.play(
            ShowCreation(dashed_line1),
            FadeIn(l1_label)
        )

        self.wait(2)


# ==================== Scene 6: 呈现c2，在x=s上上下移动，最后切于l1 ====================
class KDistanceScene6(Scene):
    def construct(self):
        grid, axes = create_axes_and_grid()
        self.add(grid, axes)

        y_eq_x = axes.get_graph(
            lambda x: x,
            x_range=(-8, 8),
            color=BLUE,
            stroke_width=2
        )
        y_eq_x_label = axes.get_graph_label(y_eq_x, 'y=x')
        self.add(y_eq_x, y_eq_x_label)

        unit_length = get_unit_length(axes)
        center_c1 = axes.c2p(0, 1)

        # 三角形PQR（已旋转π/4）
        triangle_vertices = [
            center_c1 + unit_length * np.array([np.cos(PI/2 + PI/4), np.sin(PI/2 + PI/4), 0]),
            center_c1 + unit_length * np.array([np.cos(PI/2 + 2*PI/3 + PI/4), np.sin(PI/2 + 2*PI/3 + PI/4), 0]),
            center_c1 + unit_length * np.array([np.cos(PI/2 + 4*PI/3 + PI/4), np.sin(PI/2 + 4*PI/3 + PI/4), 0])
        ]
        triangle = Polygon(*triangle_vertices)
        triangle.set_stroke(RED, width=2)

        labels = ["P", "Q", "R"]
        directions = [UP, DL, DR]
        vertex_labels = VGroup()
        for vertex, label, direction in zip(triangle_vertices, labels, directions):
            txt = Text(label, font_size=20, color=RED)
            txt.next_to(vertex, direction * 0.3)
            vertex_labels.add(txt)

        c1 = Circle(radius=unit_length)
        c1.set_stroke(BLUE, width=2)
        c1.move_to(center_c1)
        c1_label = Text("c1", font_size=24, color=BLUE)
        c1_label.next_to(c1, LEFT, buff=0.1)
        center_dot_c1 = Dot(center_c1, color=WHITE, radius=0.08)
        center_label_c1 = Text("C", font_size=24, color=BLUE)
        center_label_c1.next_to(center_dot_c1, UP, buff=0.1)

        # l1和l2
        b1 = 1 + np.sqrt(2) / 2
        b2 = 1 - np.sqrt(2) / 2
        line1 = axes.get_graph(
            lambda x: x + b1,
            x_range=(-8, 8),
            color=RED,
            stroke_width=2
        )
        dashed_line1 = DashedVMobject(line1)
        l1_label = Text("l1", font_size=24, color=RED)
        l1_label.move_to(axes.c2p(3, 3 + b1))

        line2 = axes.get_graph(
            lambda x: x + b2,
            x_range=(-8, 8),
            color=RED,
            stroke_width=2
        )
        dashed_line2 = DashedVMobject(line2)
        l2_label = Text("l2", font_size=24, color=RED)
        l2_label.move_to(axes.c2p(3, 3 + b2))

        # x=s
        x_eq_s = DashedLine(
            start=axes.c2p(0, -7),
            end=axes.c2p(0, 7),
            color=PURPLE,
            stroke_width=2
        )
        x_s_label = Text("x = s", font_size=24, color=PURPLE)
        x_s_label.next_to(x_eq_s, UP + RIGHT)

        self.add(triangle, vertex_labels, c1, c1_label, center_dot_c1, center_label_c1,
                 dashed_line1, l1_label, dashed_line2, l2_label, x_eq_s, x_s_label)

        # 呈现c2，初始位置(0,6)
        center_c2 = axes.c2p(0, 6)
        c2 = Circle(radius=unit_length)
        c2.set_stroke(GREEN, width=2)
        c2.move_to(center_c2)
        center_dot_c2 = Dot(center_c2, color=WHITE, radius=0.08)
        center_label_c2 = Text("a", font_size=24, color=GREEN)
        center_label_c2.next_to(center_dot_c2, UP, buff=0.1)
        c2_label = Text("c2", font_size=24, color=GREEN)
        c2_label.next_to(c2, LEFT, buff=0.1)

        self.play(
            ShowCreation(c2),
            FadeIn(center_dot_c2),
            FadeIn(center_label_c2),
            FadeIn(c2_label)
        )

        self.wait(0.5)

        # 摄像机拉远，以便看到c2的完整移动范围
        self.play(
            self.camera.frame.animate.scale(1.8),
            run_time=1
        )

        self.wait(0.5)

        # 向下移动与l1相切
        t_tangent = 1 + 3 * np.sqrt(2) / 2
        start_y = 6
        dy = t_tangent - start_y
        move_vector = axes.c2p(0, dy) - axes.c2p(0, 0)

        self.play(
            c2.animate.shift(move_vector),
            center_dot_c2.animate.shift(move_vector),
            center_label_c2.animate.shift(move_vector),
            c2_label.animate.shift(move_vector),
            run_time=3
        )

        # 垂线
        foot_x = np.sqrt(2) / 2
        foot_y = t_tangent - np.sqrt(2) / 2
        foot_point = axes.c2p(foot_x, foot_y)
        a_point = axes.c2p(0, t_tangent)
        perpendicular = Line(a_point, foot_point, color=GREEN, stroke_width=2)

        self.play(
            ShowCreation(perpendicular)
        )

        self.wait(2)


# ==================== Scene 7: 移动c2切于l2 ====================
class KDistanceScene7(Scene):
    def construct(self):
        grid, axes = create_axes_and_grid()
        self.add(grid, axes)

        y_eq_x = axes.get_graph(
            lambda x: x,
            x_range=(-8, 8),
            color=BLUE,
            stroke_width=2
        )
        y_eq_x_label = axes.get_graph_label(y_eq_x, 'y=x')
        self.add(y_eq_x, y_eq_x_label)

        # 以拉远的摄像机开始（与Scene6结束状态一致）
        self.camera.frame.scale(1.8)

        unit_length = get_unit_length(axes)
        center_c1 = axes.c2p(0, 1)

        # 三角形PQR（已旋转π/4）
        triangle_vertices = [
            center_c1 + unit_length * np.array([np.cos(PI/2 + PI/4), np.sin(PI/2 + PI/4), 0]),
            center_c1 + unit_length * np.array([np.cos(PI/2 + 2*PI/3 + PI/4), np.sin(PI/2 + 2*PI/3 + PI/4), 0]),
            center_c1 + unit_length * np.array([np.cos(PI/2 + 4*PI/3 + PI/4), np.sin(PI/2 + 4*PI/3 + PI/4), 0])
        ]
        triangle = Polygon(*triangle_vertices)
        triangle.set_stroke(RED, width=2)

        labels = ["P", "Q", "R"]
        directions = [UP, DL, DR]
        vertex_labels = VGroup()
        for vertex, label, direction in zip(triangle_vertices, labels, directions):
            txt = Text(label, font_size=20, color=RED)
            txt.next_to(vertex, direction * 0.3)
            vertex_labels.add(txt)

        c1 = Circle(radius=unit_length)
        c1.set_stroke(BLUE, width=2)
        c1.move_to(center_c1)
        c1_label = Text("c1", font_size=24, color=BLUE)
        c1_label.next_to(c1, LEFT, buff=0.1)
        center_dot_c1 = Dot(center_c1, color=WHITE, radius=0.08)
        center_label_c1 = Text("C", font_size=24, color=BLUE)
        center_label_c1.next_to(center_dot_c1, UP, buff=0.1)

        # l1和l2
        b1 = 1 + np.sqrt(2) / 2
        b2 = 1 - np.sqrt(2) / 2
        line1 = axes.get_graph(
            lambda x: x + b1,
            x_range=(-8, 8),
            color=RED,
            stroke_width=2
        )
        dashed_line1 = DashedVMobject(line1)
        l1_label = Text("l1", font_size=24, color=RED)
        l1_label.move_to(axes.c2p(3, 3 + b1))

        line2 = axes.get_graph(
            lambda x: x + b2,
            x_range=(-8, 8),
            color=RED,
            stroke_width=2
        )
        dashed_line2 = DashedVMobject(line2)
        l2_label = Text("l2", font_size=24, color=RED)
        l2_label.move_to(axes.c2p(3, 3 + b2))

        # x=s
        x_eq_s = DashedLine(
            start=axes.c2p(0, -7),
            end=axes.c2p(0, 7),
            color=PURPLE,
            stroke_width=2
        )
        x_s_label = Text("x = s", font_size=24, color=PURPLE)
        x_s_label.next_to(x_eq_s, UP + RIGHT)

        # c2在l1相切位置
        t_tangent = 1 + 3 * np.sqrt(2) / 2
        center_c2 = axes.c2p(0, t_tangent)
        c2 = Circle(radius=unit_length)
        c2.set_stroke(GREEN, width=2)
        c2.move_to(center_c2)
        center_dot_c2 = Dot(center_c2, color=WHITE, radius=0.08)
        center_label_c2 = Text("a", font_size=24, color=GREEN)
        center_label_c2.next_to(center_dot_c2, UP, buff=0.1)
        c2_label = Text("c2", font_size=24, color=GREEN)
        c2_label.next_to(c2, LEFT, buff=0.1)

        foot_x = np.sqrt(2) / 2
        foot_y = t_tangent - np.sqrt(2) / 2
        foot_point = axes.c2p(foot_x, foot_y)
        a_point = axes.c2p(0, t_tangent)
        perpendicular = Line(a_point, foot_point, color=GREEN, stroke_width=2)

        self.add(triangle, vertex_labels, c1, c1_label, center_dot_c1, center_label_c1,
                 dashed_line1, l1_label, dashed_line2, l2_label, x_eq_s, x_s_label,
                 c2, center_dot_c2, center_label_c2, c2_label, perpendicular)

        self.wait(1)

        # 消失垂线
        self.play(FadeOut(perpendicular))

        # 继续向下移动与l2相切
        t_tangent_l2 = 1 - 3 * np.sqrt(2) / 2
        dy2 = t_tangent_l2 - t_tangent
        move_vector = axes.c2p(0, dy2) - axes.c2p(0, 0)

        self.play(
            c2.animate.shift(move_vector),
            center_dot_c2.animate.shift(move_vector),
            center_label_c2.animate.shift(move_vector),
            c2_label.animate.shift(move_vector),
            run_time=3
        )

        # 到l2的垂线
        foot_x_l2 = -np.sqrt(2) / 2
        foot_y_l2 = t_tangent_l2 + np.sqrt(2) / 2
        foot_point_l2 = axes.c2p(foot_x_l2, foot_y_l2)
        a_point_l2 = axes.c2p(0, t_tangent_l2)
        perpendicular_l2 = Line(a_point_l2, foot_point_l2, color=GREEN, stroke_width=2)

        self.play(
            ShowCreation(perpendicular_l2)
        )

        self.wait(2)


# ==================== Scene 8: 在y=1上移动c1 ====================
class KDistanceScene8(Scene):
    def construct(self):
        grid, axes = create_axes_and_grid()
        self.add(grid, axes)

        # y=1直线
        y_eq_1 = axes.get_graph(
            lambda x: 1,
            x_range=(-10, 10),
            color=YELLOW,
            stroke_width=2
        )
        dashed_y_eq_1 = DashedVMobject(y_eq_1)
        y_eq_1_label = axes.get_graph_label(y_eq_1, 'y=1')
        self.add(dashed_y_eq_1, y_eq_1_label)

        y_eq_x = axes.get_graph(
            lambda x: x,
            x_range=(-8, 8),
            color=BLUE,
            stroke_width=2
        )
        y_eq_x_label = axes.get_graph_label(y_eq_x, 'y=x')
        self.add(y_eq_x, y_eq_x_label)

        # 以拉远的摄像机开始（与Scene7结束状态一致）
        self.camera.frame.scale(1.8)

        unit_length = get_unit_length(axes)
        center_c1 = axes.c2p(0, 1)

        # 三角形PQR（已旋转π/4）
        triangle_vertices = [
            center_c1 + unit_length * np.array([np.cos(PI/2 + PI/4), np.sin(PI/2 + PI/4), 0]),
            center_c1 + unit_length * np.array([np.cos(PI/2 + 2*PI/3 + PI/4), np.sin(PI/2 + 2*PI/3 + PI/4), 0]),
            center_c1 + unit_length * np.array([np.cos(PI/2 + 4*PI/3 + PI/4), np.sin(PI/2 + 4*PI/3 + PI/4), 0])
        ]
        triangle = Polygon(*triangle_vertices)
        triangle.set_stroke(RED, width=2)

        labels = ["P", "Q", "R"]
        directions = [UP, DL, DR]
        vertex_labels = VGroup()
        for vertex, label, direction in zip(triangle_vertices, labels, directions):
            txt = Text(label, font_size=20, color=RED)
            txt.next_to(vertex, direction * 0.3)
            vertex_labels.add(txt)

        c1 = Circle(radius=unit_length)
        c1.set_stroke(BLUE, width=2)
        c1.move_to(center_c1)
        c1_label = Text("c1", font_size=24, color=BLUE)
        c1_label.next_to(c1, LEFT, buff=0.1)
        center_dot_c1 = Dot(center_c1, color=WHITE, radius=0.08)
        center_label_c1 = Text("C", font_size=24, color=BLUE)
        center_label_c1.next_to(center_dot_c1, UP, buff=0.1)

        # l1和l2
        b1 = 1 + np.sqrt(2) / 2
        b2 = 1 - np.sqrt(2) / 2
        line1 = axes.get_graph(
            lambda x: x + b1,
            x_range=(-8, 8),
            color=RED,
            stroke_width=2
        )
        dashed_line1 = DashedVMobject(line1)
        l1_label = Text("l1", font_size=24, color=RED)
        l1_label.move_to(axes.c2p(3, 3 + b1))

        line2 = axes.get_graph(
            lambda x: x + b2,
            x_range=(-8, 8),
            color=RED,
            stroke_width=2
        )
        dashed_line2 = DashedVMobject(line2)
        l2_label = Text("l2", font_size=24, color=RED)
        l2_label.move_to(axes.c2p(3, 3 + b2))

        # x=s
        x_eq_s = DashedLine(
            start=axes.c2p(0, -7),
            end=axes.c2p(0, 7),
            color=PURPLE,
            stroke_width=2
        )
        x_s_label = Text("x = s", font_size=24, color=PURPLE)
        x_s_label.next_to(x_eq_s, UP + RIGHT)

        # c2在l2相切位置
        t_tangent_l2 = 1 - 3 * np.sqrt(2) / 2
        center_c2 = axes.c2p(0, t_tangent_l2)
        c2 = Circle(radius=unit_length)
        c2.set_stroke(GREEN, width=2)
        c2.move_to(center_c2)
        center_dot_c2 = Dot(center_c2, color=WHITE, radius=0.08)
        center_label_c2 = Text("a", font_size=24, color=GREEN)
        center_label_c2.next_to(center_dot_c2, UP, buff=0.1)
        c2_label = Text("c2", font_size=24, color=GREEN)
        c2_label.next_to(c2, LEFT, buff=0.1)

        foot_x_l2 = -np.sqrt(2) / 2
        foot_y_l2 = t_tangent_l2 + np.sqrt(2) / 2
        foot_point_l2 = axes.c2p(foot_x_l2, foot_y_l2)
        a_point_l2 = axes.c2p(0, t_tangent_l2)
        perpendicular_l2 = Line(a_point_l2, foot_point_l2, color=GREEN, stroke_width=2)

        self.add(triangle, vertex_labels, c1, c1_label, center_dot_c1, center_label_c1,
                 dashed_line1, l1_label, dashed_line2, l2_label, x_eq_s, x_s_label,
                 c2, center_dot_c2, center_label_c2, c2_label, perpendicular_l2)

        self.wait(1)

        # 整体沿着y=1向右移动2个单位
        move_distance_x = 2
        move_vector = axes.c2p(move_distance_x, 0) - axes.c2p(0, 0)

        self.play(
            c1.animate.shift(move_vector),
            center_dot_c1.animate.shift(move_vector),
            center_label_c1.animate.shift(move_vector),
            c1_label.animate.shift(move_vector),
            triangle.animate.shift(move_vector),
            vertex_labels.animate.shift(move_vector),
            x_eq_s.animate.shift(move_vector),
            x_s_label.animate.shift(move_vector),
            c2.animate.shift(move_vector),
            center_dot_c2.animate.shift(move_vector),
            center_label_c2.animate.shift(move_vector),
            c2_label.animate.shift(move_vector),
            dashed_line1.animate.shift(move_vector),
            dashed_line2.animate.shift(move_vector),
            l1_label.animate.shift(move_vector),
            l2_label.animate.shift(move_vector),
            perpendicular_l2.animate.shift(move_vector),
            run_time=4
        )

        self.wait(2)
