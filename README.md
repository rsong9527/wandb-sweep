# WandB Sweep + Jupyter Notebook Issue Reproduction

这个项目用于复现 WandB sweep 在 Jupyter Notebook 中的 `LookupError: shell_parent` 问题。

## 问题描述

**⚠️ 注意：此问题在 WandB 0.22.x+ 版本中已修复！**

在 **WandB 0.21.0** 版本中，当在 Jupyter notebook 中使用 `wandb.agent()` 运行 hyperparameter sweep 时，所有 sweep runs 都会失败，出现：

```
LookupError: <ContextVar name='shell_parent' at 0x...>
```

**版本状态：**
- ✅ WandB 0.19.x - 可以运行（旧版本）
- ❌ WandB 0.21.0 - 有此 bug
- ✅ WandB 0.22.2+ - 已修复

## 复现步骤

### ⚠️ 重要：需要特定版本才能复现

要复现 `LookupError` 问题，必须使用 **WandB 0.21.0**：

```bash
pip install wandb==0.21.0 ipywidgets traitlets jupyter
```

如果使用 0.22.2+ 版本，此问题已被修复，不会看到错误。

### 1. 安装依赖（复现问题版本）

```bash
pip install wandb==0.21.0 ipywidgets traitlets jupyter
```

### 2. 启动 Jupyter Notebook

```bash
jupyter notebook
```

### 3. 打开并运行 `reproduce_issue.ipynb`

按照 notebook 中的单元格顺序执行：

1. **安装依赖** - 确保所有包都是最新版本
2. **导入库** - 检查 wandb 版本
3. **登录 WandB** - 使用你的 API key
4. **定义 sweep 配置** - 简单的超参数搜索
5. **定义训练函数** - 会被 wandb.agent 多次调用
6. **创建 sweep** - 获取 sweep_id
7. **运行 agent** - ⚠️ **这里会触发错误**

## 预期错误

运行 `wandb.agent()` 单元格时，你会看到类似的错误：

```python
❌ ERROR OCCURRED: LookupError
Error message: <ContextVar name='shell_parent' at 0x...>

Full traceback:
  File "wandb/sdk/wandb_init.py", line ...
  File "wandb/sdk/interface/interface.py", line ...
  File "wandb/jupyter.py", line ..., in _PrinterJupyter.__init__
  File "ipykernel/zmqshell.py", line ..., in get_parent
    return shell_parent.get()
LookupError: <ContextVar name='shell_parent'>
```

## 问题原因

- **WandB Sweep 设计**：在独立进程/线程中运行多个实验
- **Jupyter Context**：绑定到单个 notebook cell 的执行上下文
- **冲突**：wandb.agent 在新上下文中调用函数时，Jupyter 的 `shell_parent` 上下文变量不存在

## 推荐的解决方案

### ✅ 正确的工作流

**在 Notebook 中只创建 sweep，不运行 agent：**

```python
# notebook.ipynb
import wandb

sweep_config = {...}
sweep_id = wandb.sweep(sweep_config, project="my_project")
print(f"Sweep ID: {sweep_id}")
```

**创建独立的 Python 脚本来运行训练：**

```python
# train.py
import wandb

def train():
    run = wandb.init()
    # 训练代码...
    run.finish()

if __name__ == "__main__":
    # 从命令行运行
    pass
```

**在终端运行 agent：**

```bash
wandb agent <sweep_id>
```

## 临时 Workaround（不推荐）

如果必须在 notebook 中运行，可以尝试：

```python
import os
os.environ['WANDB_CONSOLE'] = 'off'
os.environ['WANDB_JUPYTER'] = 'false'

import wandb

def train():
    wandb.init(
        project="test",
        settings=wandb.Settings(console="off")
    )
    # 训练代码...

wandb.agent(sweep_id, function=train, count=3)
```

但这种方法不稳定，**强烈建议使用独立脚本运行 sweep**。

## 环境信息

**复现问题需要：**
- Python: 3.8+
- **WandB: 0.21.0** (特定版本，0.22.2+ 已修复)
- ipywidgets: latest
- traitlets: latest
- Jupyter: latest

**推荐使用：**
- WandB: **0.22.2+** (问题已修复)

## 相关链接

- GitHub Issue: [链接到原始 issue]
- WandB Sweeps 文档: https://docs.wandb.ai/guides/sweeps

