# 快速开始 - 复现 WandB Sweep 问题

## 📦 安装

```bash
cd /Users/rsong/wandb-sweep
pip install -r requirements.txt
```

## 🔴 复现问题

### 步骤 1: 启动 Jupyter

```bash
jupyter notebook
```

### 步骤 2: 打开 `reproduce_issue.ipynb`

在 Jupyter 中打开 `reproduce_issue.ipynb` 并按顺序运行所有单元格。

### 步骤 3: 观察错误

当你运行到标记为 "⚠️ THIS CELL WILL TRIGGER THE ERROR ⚠️" 的单元格时，你会看到：

```
❌ ERROR OCCURRED: LookupError
Error message: <ContextVar name='shell_parent' at 0x...>

Traceback (most recent call last):
  ...
  File "ipykernel/zmqshell.py", line XXX, in get_parent
    return shell_parent.get()
LookupError: <ContextVar name='shell_parent'>
```

## ✅ 正确的工作流

### 步骤 1: 在 Notebook 中创建 Sweep

打开 `create_sweep.ipynb` 并运行前面的单元格来创建 sweep：

```python
import wandb

sweep_config = {...}
sweep_id = wandb.sweep(sweep_config, project="my-project")
print(f"Sweep ID: {sweep_id}")
```

你会得到类似这样的输出：
```
Sweep ID: your-username/my-project/abc123xyz
```

### 步骤 2: 在终端运行 Agent

**方法 A - 使用 WandB CLI (推荐):**

```bash
wandb agent your-username/my-project/abc123xyz
```

**方法 B - 使用我们的脚本:**

```bash
python train.py your-username/my-project/abc123xyz 10
```

### 步骤 3: 在 Notebook 中查看结果

回到 `create_sweep.ipynb`，运行最后的单元格来查看结果和可视化。

## 🔬 问题原因

### 技术细节：

1. **Jupyter 的执行模型**
   - 每个 cell 在特定的执行上下文中运行
   - Jupyter kernel 使用 `shell_parent` 这个 ContextVar 来追踪当前执行上下文
   - 这个变量用于关联输出、widgets 和消息

2. **WandB Agent 的执行模型**
   ```python
   # 简化的伪代码
   def wandb.agent(sweep_id, function, count):
       for i in range(count):
           # 在新的线程/进程/上下文中执行
           run_in_new_context(function)  # ❌ shell_parent 不存在
   ```

3. **冲突点**
   ```
   wandb.init() 
     → 检测到在 Jupyter 中运行 ✓
     → 尝试创建 _PrinterJupyter widget
     → 需要访问 shell_parent.get()
     → ❌ LookupError: 上下文中没有这个变量
   ```

### 为什么突然出现？

可能的原因：
- `ipykernel` 升级，对上下文检查变得更严格
- `ipywidgets` 升级，改变了 widget 初始化逻辑
- `wandb` 升级，改变了 Jupyter 环境检测逻辑

## 💡 解决方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **独立脚本 + 终端** | ✅ 稳定可靠<br>✅ 易于并行<br>✅ 符合最佳实践 | ⚠️ 需要切换终端 | ⭐⭐⭐⭐⭐ |
| **环境变量 workaround** | ✅ 可以在 notebook 中运行 | ❌ 不稳定<br>❌ 可能随版本失效 | ⭐⭐ |
| **Subprocess 后台运行** | ✅ 无需切换终端 | ❌ 难以调试<br>❌ 输出管理复杂 | ⭐⭐⭐ |
| **降级版本** | ✅ 临时可用 | ❌ 无法使用新特性<br>❌ 不是长期方案 | ⭐⭐ |

## 🎯 最佳实践总结

### ✅ DO - 推荐做法

1. **Notebook 用于探索**
   ```python
   # 在 notebook 中
   - 数据可视化
   - 原型设计
   - 创建 sweep 配置
   - 分析结果
   ```

2. **脚本用于生产**
   ```python
   # 在 .py 脚本中
   - 训练循环
   - Sweep agent
   - 长时间运行的任务
   ```

3. **终端用于执行**
   ```bash
   # 在终端中
   $ wandb agent <sweep-id>
   $ python train.py
   ```

### ❌ DON'T - 避免做法

1. ❌ 不要在 notebook 中调用 `wandb.agent()`
2. ❌ 不要在 notebook cell 中跑长时间训练
3. ❌ 不要期望 notebook 能处理多进程/多线程任务
4. ❌ 不要混合交互式和批处理工作流

## 📚 相关资源

- [WandB Sweeps 官方文档](https://docs.wandb.ai/guides/sweeps)
- [Jupyter + WandB 最佳实践](https://docs.wandb.ai/guides/integrations/jupyter)
- [Python ContextVars 文档](https://docs.python.org/3/library/contextvars.html)

## 🐛 已知问题

这个问题在以下环境中已确认：

- ✅ Mac M1 Pro + VSCode Jupyter
- ✅ AWS SageMaker Notebook
- ✅ Local Jupyter Notebook
- ✅ JupyterLab

使用的包版本：
- `wandb >= 0.21.0`
- `ipywidgets` (最新版本)
- `ipykernel` (最新版本)
- `traitlets` (最新版本)

## ❓ FAQ

**Q: 我必须使用终端吗？**  
A: 不一定。你可以用 `subprocess` 在 notebook 中启动后台进程，但这会增加复杂性。

**Q: 可以完全修复这个问题吗？**  
A: 目前没有完美的 workaround。这是架构层面的不兼容。等待 WandB 官方修复。

**Q: 为什么以前可以用？**  
A: 可能是依赖包升级导致的。旧版本对上下文检查不够严格。

**Q: 有官方回应吗？**  
A: WandB 团队已经意识到这个问题，正在调查中。

## 🤝 贡献

如果你找到了更好的解决方案，欢迎提交 PR！

