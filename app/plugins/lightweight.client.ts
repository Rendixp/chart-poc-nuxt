import { defineNuxtPlugin } from '#app'
import { createChart } from 'lightweight-charts'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      lwc: {
        createChart
      }
    }
  }
})
