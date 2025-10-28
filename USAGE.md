# 使用说明

## 文件说明

本项目包含以下文件来帮助你复现和理解 WandB Sweep 在 Jupyter Notebook 中的问题：

### 📓 Notebooks

1. **`reproduce_issue.ipynb`** - 复现问题
   - 展示如何触发 `LookupError: shell_parent` 错误
   - 包含多个测试场景
   - 用于理解问题的根本原因

2. **`create_sweep.ipynb`** - 推荐工作流
   - 展示正确的 sweep 使用方式
   - 在 notebook 中创建 sweep，在终端运行 agent
   - 包含结果分析和可视化

### 🐍 Python 脚本

3. **`train.py`** - 独立训练脚本
   - 用于在终端运行 sweep agent
   - 可以直接使用或作为模板修改
   - 支持命令行参数

### 📄 文档

4. **`README.md`** - 项目概述
5. **`QUICKSTART.md`** - 快速开始指南
6. **`requirements.txt`** - Python 依赖

## 快速使用

### 1️⃣ 复现问题

```bash
# 安装依赖
pip install -r requirements.txt

# 启动 Jupyter
jupyter notebook

# 打开并运行 reproduce_issue.ipynb
```

### 2️⃣ 使用正确的工作流

**在 Notebook 中 (create_sweep.ipynb):**
```python
# 创建 sweep
sweep_id = wandb.sweep(sweep_config, project="my-project")
```

**在终端中:**
```bash
# 运行 agent
wandb agent <sweep_id>

# 或使用我们的脚本
python train.py <sweep_id> 10
```

## 问题总结

### 问题本质
WandB Sweep 和 Jupyter Notebook **架构不兼容**：

```
┌─────────────────────────┐     ┌─────────────────────────┐
│   Jupyter Notebook      │     │    WandB Sweep          │
├─────────────────────────┤     ├─────────────────────────┤
│ • 交互式环境            │     │ • 批处理工具            │
│ • 单线程执行            │  ✖  │ • 多进程/多线程         │
│ • 有状态上下文          │     │ • 无状态执行            │
│ • shell_parent 绑定     │     │ • 独立上下文            │
└─────────────────────────┘     └─────────────────────────┘
```

### 技术细节

```python
# Jupyter Kernel 的执行
Cell 1: wandb.sweep(...)  # ✓ shell_parent 存在
Cell 2: wandb.agent(...)  
  └─> 启动新线程/进程
      └─> 调用 train()
          └─> wandb.init()  # ✗ shell_parent 不存在
              └─> _PrinterJupyter()
                  └─> get_parent()
                      └─> shell_parent.get()
                          └─> LookupError!
```

### 错误信息
```
LookupError: <ContextVar name='shell_parent' at 0x...>
```

## 解决方案

### ✅ 推荐方案：分离工作流

| 阶段 | 工具 | 用途 |
|------|------|------|
| 探索 | Jupyter Notebook | 数据分析、可视化、原型 |
| 配置 | Jupyter Notebook | 定义 sweep config |
| 创建 | Jupyter Notebook | `wandb.sweep()` |
| 执行 | Terminal + Script | `wandb agent` 或 `python train.py` |
| 分析 | Jupyter Notebook | 查看结果、生成报告 |

### ⚠️ Workaround (不推荐)

如果一定要在 notebook 中运行：

```python
import os

# 方法 1: 禁用 Jupyter 模式
os.environ['WANDB_JUPYTER'] = 'false'
os.environ['WANDB_CONSOLE'] = 'off'

# 方法 2: 使用 subprocess 后台运行
import subprocess
process = subprocess.Popen(['wandb', 'agent', sweep_id])
```

但这些方法**不稳定**，可能随时失效。

## 代码示例

### 示例 1: 在 Notebook 中创建 Sweep

```python
import wandb

# 定义配置
sweep_config = {
    'method': 'bayes',
    'metric': {'name': 'loss', 'goal': 'minimize'},
    'parameters': {
        'learning_rate': {'min': 0.0001, 'max': 0.1},
        'batch_size': {'values': [16, 32, 64]}
    }
}

# 登录并创建
wandb.login()
sweep_id = wandb.sweep(sweep_config, project="my-project")
print(f"Sweep created: {sweep_id}")
```

### 示例 2: 创建训练脚本

```python
# train.py
import wandb

def train():
    run = wandb.init()
    config = wandb.config
    
    # 你的训练代码
    for epoch in range(10):
        loss = train_one_epoch(config)
        wandb.log({'loss': loss, 'epoch': epoch})
    
    run.finish()

if __name__ == "__main__":
    # 不需要在这里调用 wandb.agent
    # 直接从命令行运行: wandb agent <sweep_id>
    pass
```

### 示例 3: 在终端运行

```bash
# 方法 1: 使用 wandb CLI (最简单)
wandb agent username/project/sweep_id

# 方法 2: 指定运行次数
wandb agent username/project/sweep_id --count 20

# 方法 3: 并行运行多个 agent
wandb agent username/project/sweep_id &
wandb agent username/project/sweep_id &
wandb agent username/project/sweep_id &
```

## 常见错误

### 错误 1: 直接在 Notebook 中调用 agent

```python
# ❌ 错误做法
def train():
    wandb.init()
    # ...

wandb.agent(sweep_id, function=train)  # LookupError!
```

### 错误 2: 使用不完整的 workaround

```python
# ❌ 这个不够
wandb.init(
    settings=wandb.Settings(
        _disable_stats=True,  # 只禁用统计
        silent=True,          # 只禁用日志
    )
)
# 仍然会尝试创建 Jupyter widgets
```

### 错误 3: 在错误的地方设置环境变量

```python
# ❌ 太晚了
import wandb  # wandb 已经加载
os.environ['WANDB_JUPYTER'] = 'false'  # 无效

# ✅ 正确顺序
import os
os.environ['WANDB_JUPYTER'] = 'false'
import wandb  # 现在加载
```

## 调试技巧

### 检查当前环境

```python
import sys

# 检查是否在 Jupyter 中
def is_jupyter():
    try:
        from IPython import get_ipython
        return get_ipython() is not None
    except ImportError:
        return False

print(f"In Jupyter: {is_jupyter()}")

# 检查环境变量
import os
print(f"WANDB_JUPYTER: {os.environ.get('WANDB_JUPYTER', 'not set')}")
print(f"WANDB_CONSOLE: {os.environ.get('WANDB_CONSOLE', 'not set')}")
```

### 查看 shell_parent 状态

```python
from contextvars import ContextVar

# 检查 shell_parent 是否存在
try:
    from ipykernel.zmqshell import shell_parent
    value = shell_parent.get()
    print(f"✅ shell_parent exists: {value}")
except Exception as e:
    print(f"❌ shell_parent error: {e}")
```

## 总结

| 概念 | 说明 |
|------|------|
| **问题** | Jupyter 上下文与 WandB agent 的多进程执行不兼容 |
| **原因** | `shell_parent` ContextVar 在 agent 创建的新上下文中不存在 |
| **解决** | 分离工作流：notebook 用于配置，脚本+终端用于执行 |
| **状态** | 这是已知的架构问题，等待官方修复 |

**记住：Jupyter 适合探索，Terminal 适合生产！** 🎯

