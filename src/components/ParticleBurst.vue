<template>
  <div
    class="particle-wrapper"
    @mouseenter="spawnParticles"
    @mouseleave="handleMouseLeave"
    ref="containerRef"
  >
    <slot></slot>

    <!--
      【优化1】用 v-for 替代手动 DOM 操作
      原来用 document.createElement 直接操作 DOM，绕过了 Vue 响应式系统，
      不利于维护和调试。现在改为数据驱动：修改 particles 数组，视图自动更新。
    -->
    <div
      v-for="p in particles"
      :key="p.id"
      class="orbit-item"
      :class="{ 'is-leaving': p.leaving }"
      :style="{
        '--start-angle': p.startAngle,
        '--radius': p.radius,
        '--duration': p.duration,
      }"
    >
      <span class="p-emoji">{{ p.emoji }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const containerRef = ref<HTMLElement | null>(null)

// 【优化2】用响应式数组管理粒子状态，替代直接 DOM 节点操作
interface Particle {
  id: number
  emoji: string
  startAngle: string
  radius: string
  duration: string
  leaving: boolean // 用于触发离场动画
}

const particles = ref<Particle[]>([])

// 【优化3】用一个自增 ID 生成器替代原来依赖数组 index 作为 key
// 确保每次 spawn 的粒子 key 唯一，防止 Vue diff 复用错误节点
let uidCounter = 0
const nextId = () => ++uidCounter

// 【优化4】用 Set 追踪"正在离场的 timer"，防止快速 hover 时 timer 堆积
// 原代码没有 timer 清理，反复 hover 可能导致旧的延迟回调删除新一轮的粒子
const leaveTimers = new Set<ReturnType<typeof setTimeout>>()

// 【优化5】移除 emoji 池中的重复项（原来 🪗 出现两次，🎤🎧📻🎼 各出现两次）
const emojiBase = [
  // 🎵 音乐符号
  '🎵',
  '🎶',
  '🎼',
  '🎙',
  '🎤',
  '🎧',
  '📻',
  '🔊',
  '🔉',
  '🔈',
  '🎸',
  '🎹',
  '🎺',
  '🎻',
  '🥁',
  '🎷',
  '🪗',
  '🪘',
  '🪕',
  '🪈',
  '🎚',
  '🎛',
  '📯',
  '🔔',
  // 🌈 氛围 / 光效
  '✨',
  '💫',
  '🌟',
  '⭐',
  '🌠',
  '🔥',
  '💥',
  '🌈',
  '🌊',
  '🌙',
  // 💜 心 / 泡泡
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🖤',
  '🤍',
  '🤎',
  '💗',
  // 🕺 活力 / 派对
  '🕺',
  '💃',
  '🎉',
  '🎊',
  '🥳',
  '🪩',
  // 🌸 自然氛围
  '🌸',
  '🌺',
  '🌻',
  '🍀',
  '🌿',
  '🫧',
  '🌴',
  '🍄',
  '☀️',
]

// Fisher-Yates 洗牌（保持不变）
const shuffle = (array: string[]) => {
  const newArr = [...array]
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArr[i] as string, newArr[j] as string] = [newArr[j] as string, newArr[i] as string]
  }
  return newArr
}

const layers = [
  { count: 4, radius: 40 },
  { count: 8, radius: 70 },
  { count: 12, radius: 100 },
]

const spawnParticles = () => {
  // 【优化6】改为判断粒子数组是否已有内容，语义更清晰
  // 同时先清掉所有正在等待执行的 leave timer，防止它们删掉新一轮粒子
  if (particles.value.length > 0) return

  // 清掉所有上一轮还没执行完的离场 timer
  leaveTimers.forEach((t) => clearTimeout(t))
  leaveTimers.clear()

  const shuffledPool = shuffle(emojiBase)
  let poolIndex = 0
  const newParticles: Particle[] = []

  layers.forEach((layer) => {
    for (let i = 0; i < layer.count; i++) {
      const startAngle = (360 / layer.count) * i
      const emoji = shuffledPool[poolIndex % shuffledPool.length] || ''
      poolIndex++

      newParticles.push({
        id: nextId(),
        emoji,
        startAngle: `${startAngle}deg`,
        radius: `${layer.radius}px`,
        duration: '6s',
        leaving: false,
      })
    }
  })

  particles.value = newParticles
}

const handleMouseLeave = () => {
  // 【优化7】离场时先给所有粒子加上 leaving 状态，触发 CSS fade-out 动画
  // 等动画播完（400ms，与 burst 时长对称）再从数组中移除，避免硬切消失
  particles.value.forEach((p) => (p.leaving = true))

  const t = setTimeout(() => {
    particles.value = []
    leaveTimers.delete(t)
  }, 400) // 与 .is-leaving 的 transition duration 保持一致

  leaveTimers.add(t)
}

// 【优化8】组件卸载时清理所有 timer 和粒子，防止内存泄漏
// 原代码 onUnmounted 完全缺失
onUnmounted(() => {
  leaveTimers.forEach((t) => clearTimeout(t))
  leaveTimers.clear()
  particles.value = []
})
</script>

<style scoped>
.particle-wrapper {
  position: relative;
  display: inline-block;
  overflow: visible !important;
}

/*
  【优化9】orbit-item 现在是 scoped 样式直接管理的元素（不再需要 :deep()）
  因为粒子节点由 v-for 在本组件模板里渲染，属于同一 scoped 作用域。
*/
.orbit-item {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  will-change: transform, opacity;

  /*
    【优化10】动画拆分说明：
    原代码 burst(forwards) + loop(infinite) 两段动画同时作用于 transform，
    在部分浏览器里 burst 的 forwards 最终帧会被 loop 覆盖时产生跳帧。
    解决方案：把 opacity 淡入拆成独立的 fade-in keyframe，
    transform 只由 burst + loop 负责，互不干扰。
  */
  animation:
    burst 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards,
    loop var(--duration) linear infinite 0.4s,
    fade-in 0.4s ease forwards;

  /*
    【优化11】离场淡出用 transition 而非重写 animation。
    
    关键原因：如果用 .is-leaving { animation: loop ..., fade-out ... } 来覆盖，
    loop 动画会重新计时（delay 归零、从 --start-angle 重新开始），
    导致粒子在淡出前先"瞬移"回初始角度。
    
    改用 opacity transition：离场时只改 opacity 的值，
    transform 的 animation 完全不受影响，粒子在原位平滑淡出。
    transition-delay: 0s 确保立即开始淡出，不等 fade-in 的时间。
  */
  transition: opacity 0.4s ease;
}

/* 离场：只改 opacity，不碰 animation，transform 继续跑不中断 */
.orbit-item.is-leaving {
  opacity: 0;
}

.p-emoji {
  font-size: 16px;
  user-select: none;
}

/* burst：只负责 transform，从中心弹出到轨道位置 */
@keyframes burst {
  0% {
    transform: rotate(var(--start-angle)) translateY(0) scale(0);
  }
  100% {
    transform: rotate(var(--start-angle)) translateY(calc(-1 * var(--radius))) scale(1);
  }
}

/* loop：在轨道半径处绕圈，顺时针旋转 360deg */
@keyframes loop {
  from {
    transform: rotate(var(--start-angle)) translateY(calc(-1 * var(--radius)));
  }
  to {
    transform: rotate(calc(var(--start-angle) + 360deg)) translateY(calc(-1 * var(--radius)));
  }
}

/* 进场淡入：仅控制 opacity，与 burst/loop 互不干扰 */
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 离场淡出由 .orbit-item 上的 transition: opacity 负责，无需单独 keyframe */
</style>
