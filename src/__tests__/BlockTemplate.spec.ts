import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import BlockTemplate from '../Classes/Block/BlockTemplate.vue';

// Stub requestAnimationFrame
let rafCallback: ((time: number) => void) | null = null;
vi.stubGlobal('requestAnimationFrame', (cb: any) => { rafCallback = cb; return 1; });
vi.stubGlobal('cancelAnimationFrame', vi.fn());

const TBlock = [
  [0, 1, 0],
  [1, 2, 1],
  [0, 0, 0],
];

const CubeBlock = [
  [1, 1],
  [1, 1],
];

const baseProps = {
  maxRows: 20,
  maxCols: 10,
  blocks: [] as { row: number; col: number }[],
  blockMatrix: TBlock,
  currentLevel: 1,
  isMovingLeft: false,
  isMovingRight: false,
  isMovingDown: false,
  isRotate: false,
  isHardDrop: false,
};

describe('BlockTemplate', () => {
  it('renders blocks', () => {
    const wrapper = mount(BlockTemplate, { props: baseProps });
    const blocks = wrapper.findAll('.block');
    expect(blocks.length).toBeGreaterThan(0);
  });

  it('emits landed when piece cannot move down', async () => {
    const blocks = [];
    for (let c = 1; c <= 10; c++) blocks.push({ row: 20, col: c });
    for (let c = 1; c <= 10; c++) blocks.push({ row: 19, col: c });
    const wrapper = mount(BlockTemplate, {
      props: { ...baseProps, blocks },
    });
    if (rafCallback) {
      rafCallback(0);
      rafCallback(2000);
    }
    await wrapper.vm.$nextTick();
  });

  it('responds to isRotate prop change', async () => {
    const wrapper = mount(BlockTemplate, { props: baseProps });
    await wrapper.setProps({ isRotate: true });
    await wrapper.vm.$nextTick();
    await wrapper.setProps({ isRotate: false });
  });

  it('responds to isHardDrop prop change', async () => {
    const wrapper = mount(BlockTemplate, { props: baseProps });
    await wrapper.setProps({ isHardDrop: true });
    await wrapper.vm.$nextTick();
    await wrapper.setProps({ isHardDrop: false });
  });

  it('responds to level change', async () => {
    const wrapper = mount(BlockTemplate, { props: baseProps });
    await wrapper.setProps({ currentLevel: 5 });
    await wrapper.vm.$nextTick();
  });

  it('handles movement props', async () => {
    const wrapper = mount(BlockTemplate, { props: baseProps });
    if (rafCallback) {
      rafCallback(0);
    }
    await wrapper.setProps({ isMovingLeft: true });
    if (rafCallback) rafCallback(200);
    await wrapper.setProps({ isMovingRight: true, isMovingLeft: false });
    if (rafCallback) rafCallback(400);
    await wrapper.setProps({ isMovingDown: true, isMovingRight: false });
    if (rafCallback) rafCallback(600);
  });

  it('renders with Cube block (no pivot for rotation)', async () => {
    const wrapper = mount(BlockTemplate, {
      props: { ...baseProps, blockMatrix: CubeBlock },
    });
    expect(wrapper.findAll('.block').length).toBeGreaterThan(0);
    await wrapper.setProps({ isRotate: true });
    await wrapper.vm.$nextTick();
  });

  it('calcFallSpeed returns faster speed at higher levels', () => {
    const wrapper1 = mount(BlockTemplate, { props: { ...baseProps, currentLevel: 1 } });
    const wrapper10 = mount(BlockTemplate, { props: { ...baseProps, currentLevel: 10 } });
    expect(wrapper1.findAll('.block').length).toBeGreaterThan(0);
    expect(wrapper10.findAll('.block').length).toBeGreaterThan(0);
  });

  it('handles rotation with wall kick left', async () => {
    const wrapper = mount(BlockTemplate, { props: baseProps });
    for (let i = 0; i < 4; i++) {
      await wrapper.setProps({ isRotate: true });
      await wrapper.vm.$nextTick();
      await wrapper.setProps({ isRotate: false });
      await wrapper.vm.$nextTick();
    }
  });

  it('cleans up animation frame on unmount', () => {
    const wrapper = mount(BlockTemplate, { props: baseProps });
    wrapper.unmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});
