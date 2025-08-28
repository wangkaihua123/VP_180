import { create } from 'zustand';

interface TestCaseState {
  // 当前正在执行的测试用例的项目ID
  currentProjectId: string | null;
  // 测试用例执行状态
  isExecuting: boolean;
  // 设置当前项目ID
  setCurrentProjectId: (projectId: string | null) => void;
  // 设置执行状态
  setExecuting: (isExecuting: boolean) => void;
  // 开始执行测试用例
  startExecution: (projectId: string) => void;
  // 停止执行测试用例
  stopExecution: () => void;
}

export const useTestCaseStore = create<TestCaseState>((set) => ({
  currentProjectId: null,
  isExecuting: false,
  
  setCurrentProjectId: (projectId) => 
    set({ currentProjectId: projectId }),
    
  setExecuting: (isExecuting) => 
    set({ isExecuting }),
    
  startExecution: (projectId) => 
    set({ currentProjectId: projectId, isExecuting: true }),
    
  stopExecution: () => 
    set({ currentProjectId: null, isExecuting: false }),
}));