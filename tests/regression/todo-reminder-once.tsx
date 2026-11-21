import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useTodoReminders } from '../../src/features/todos/useTodoReminders';
import type { TodoItem } from '../../src/features/todos/types';
import { getLocalDateString } from '../../src/utils/date';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const originalInterval = window.setInterval;
const originalNow = Date.now;
let tick: (() => void) | undefined;
let now = Date.now();
Date.now = () => now;
window.setInterval = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
  if (delay === 1000 && typeof handler === 'function') {
    tick = () => handler(...args);
    return 0;
  }
  return originalInterval(handler, delay, ...args);
}) as typeof window.setInterval;
let deliveries = 0;
let attempts = 0;
const deliveryCount = () => deliveries;
let allowDelivery = true;
let scheduleRetry: () => void;
let result: TodoItem[] = [];
const initial: TodoItem = { id: 'commit-boundary', title: 'One reminder', completed: false,
  createdAt: now, remindAt: now + 60000 };
function Harness() {
  const [todos, setTodos] = useState([initial]);
  scheduleRetry = () => setTodos([{ ...initial, id: 'retry', remindAt: now - 1 }]);
  result = todos;
  useTodoReminders(todos, getLocalDateString(), setTodos, async () => {
    attempts++;
    if (!allowDelivery) return false;
    deliveries++;
    return true;
  });
  return null;
}
const root = createRoot(document.getElementById('root')!);
try {
  await act(async () => root.render(<Harness />));
  await act(async () => {
    now += 60000;
    tick?.();
    await Promise.resolve();
    await Promise.resolve();
    tick?.();
    await Promise.resolve();
  });
  if (deliveries !== 1 || !result[0].reminded) throw new Error(`Expected one delivery across two polls before React commit, got ${deliveries}/${result[0].reminded}`);
  await act(async () => { tick?.(); await Promise.resolve(); });
  if (deliveries !== 1) throw new Error('Committed reminder replayed');
  allowDelivery = false;
  const beforeRejection = attempts;
  await act(async () => { scheduleRetry(); });
  await act(async () => { tick?.(); await Promise.resolve(); });
  if (attempts !== beforeRejection + 1) throw new Error('Rejection check skipped the delivery callback');
  if (deliveries !== 1 || result[0].reminded) throw new Error('Rejected delivery was marked as delivered');
  allowDelivery = true;
  await act(async () => {
    tick?.(); await Promise.resolve(); await Promise.resolve(); tick?.(); await Promise.resolve();
  });
  if (deliveryCount() !== 2 || !result[0].reminded) throw new Error('Rejected delivery did not retry exactly once');
  document.getElementById('results')!.textContent = 'PASS delayed React commit does not replay a delivered reminder\nPASS rejected delivery remains retryable';
  document.documentElement.dataset.testResult = 'passed';
} catch (error) {
  document.getElementById('results')!.textContent = `FAIL ${String(error)}`;
  document.documentElement.dataset.testResult = 'failed';
} finally {
  await act(async () => root.unmount());
  window.setInterval = originalInterval;
  Date.now = originalNow;
}
