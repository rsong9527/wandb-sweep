"""
独立的训练脚本 - 推荐用于运行 WandB sweeps

使用方法:
1. 在 notebook 中创建 sweep 并获取 sweep_id
2. 在终端运行: wandb agent <sweep_id>
"""

import wandb
import time
import random


def train():
    """
    训练函数 - 会被 wandb.agent 调用多次
    每次调用会使用不同的超参数组合
    """
    # 初始化 wandb run
    run = wandb.init(project="test-sweep-jupyter-issue")
    
    # 从 wandb.config 获取超参数
    config = wandb.config
    
    print(f"🚀 Training with:")
    print(f"   Learning Rate: {config.learning_rate}")
    print(f"   Batch Size: {config.batch_size}")
    print(f"   Epochs: {config.epochs}")
    
    # 模拟训练过程
    for epoch in range(config.epochs):
        # 模拟训练计算
        # 较小的 learning_rate 通常会得到更好的结果
        loss = random.random() * (1 / config.learning_rate) * 0.001
        accuracy = random.random() * 0.3 + 0.7
        
        # 记录指标
        wandb.log({
            'epoch': epoch,
            'loss': loss,
            'accuracy': accuracy,
            'learning_rate': config.learning_rate,
            'batch_size': config.batch_size,
        })
        
        print(f"   Epoch {epoch + 1}/{config.epochs} - Loss: {loss:.4f}, Acc: {accuracy:.4f}")
        
        # 模拟训练时间
        time.sleep(1)
    
    # 记录最终指标
    final_loss = loss
    final_accuracy = accuracy
    
    wandb.log({
        'final_loss': final_loss,
        'final_accuracy': final_accuracy,
    })
    
    print(f"✅ Training completed! Final Loss: {final_loss:.4f}, Final Acc: {final_accuracy:.4f}")
    
    # 结束 run
    run.finish()


if __name__ == "__main__":
    import sys
    
    print("=" * 60)
    print("WandB Sweep Training Script")
    print("=" * 60)
    
    if len(sys.argv) > 1:
        sweep_id = sys.argv[1]
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        
        print(f"Running agent for sweep: {sweep_id}")
        print(f"Number of runs: {count}")
        print("=" * 60)
        
        # 运行 sweep agent
        wandb.agent(sweep_id, function=train, count=count)
    else:
        print("\n用法:")
        print("  python train.py <sweep_id> [count]")
        print("\n或者直接使用 wandb CLI:")
        print("  wandb agent <sweep_id>")
        print("\n示例:")
        print("  python train.py username/project/sweep_id 5")
        print("  wandb agent username/project/sweep_id")
        print("=" * 60)

