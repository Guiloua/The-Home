---
title: LaTeX 公式测试
date: 2026-05-01
excerpt: 测试个人主页的 LaTeX 公式渲染效果，包括行内公式和块级公式。
tags: 测试, LaTeX
publish: true
---

# LaTeX 渲染测试

这是一篇用于测试 KaTeX 渲染效果的随笔。

## 1. 行内公式 (Inline)

能量动量关系：$E^2 = (pc)^2 + (m_0c^2)^2$。

勾股定理：$a^2 + b^2 = c^2$。

## 2. 块级公式 (Display)

麦克斯韦方程组（微分形式）：

$
\begin{cases}
\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \mathbf{B} = 0 \\
\nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} = \mu_0\mathbf{J} + \mu_0\varepsilon_0\frac{\partial \mathbf{E}}{\partial t}
\end{cases}
$

高斯积分：

$ \int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi} $

## 3. 复杂矩阵与对齐

$
\mathbf{A} = \begin{pmatrix}
a_{11} & a_{12} & \cdots & a_{1n} \\
a_{21} & a_{22} & \cdots & a_{2n} \\
\vdots & \vdots & \ddots & \vdots \\
a_{m1} & a_{m2} & \cdots & a_{mn}
\end{pmatrix}
$

如果这些公式都能正常显示，说明配置成功！
