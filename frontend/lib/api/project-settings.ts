/**
 * 项目设置API模块
 * 
 * 该模块提供了与项目设置相关的API调用:
 * - 获取项目列表 (getProjects)
 * - 创建项目 (createProject)
 * - 更新项目 (updateProject)
 * - 删除项目 (deleteProject)
 */

// 定义项目接口
export interface Project {
  id: string;
  name: string;
  description: string;
  createTime: string;
  updateTime: string;
}

// 创建项目接口
export interface CreateProjectPayload {
  name: string;
  description: string;
}

// 更新项目接口
export interface UpdateProjectPayload {
  id: string;
  name: string;
  description: string;
}

// 项目设置API
export const projectSettingsAPI = {
  /**
   * 获取项目列表
   * @returns 项目列表
   */
  getProjects: async (): Promise<Project[]> => {
    try {
      const response = await fetch('/api/settings/projects');
      if (!response.ok) {
        throw new Error(`获取项目列表失败: ${response.statusText}`);
      }
      const data = await response.json();
      return data.projects || [];
    } catch (error) {
      console.error('获取项目列表失败:', error);
      throw error;
    }
  },
  
  /**
   * 创建新项目
   * @param project 项目信息
   * @returns 创建的项目
   */
  createProject: async (project: CreateProjectPayload): Promise<Project> => {
    try {
      const response = await fetch('/api/settings/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(project),
      });
      
      if (!response.ok) {
        throw new Error(`创建项目失败: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.project;
    } catch (error) {
      console.error('创建项目失败:', error);
      throw error;
    }
  },
  
  /**
   * 更新项目
   * @param project 更新的项目信息
   * @returns 更新后的项目
   */
  updateProject: async (project: UpdateProjectPayload): Promise<Project> => {
    try {
      const response = await fetch(`/api/settings/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(project),
      });
      
      if (!response.ok) {
        throw new Error(`更新项目失败: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.project;
    } catch (error) {
      console.error('更新项目失败:', error);
      throw error;
    }
  },
  
  /**
   * 删除项目
   * @param id 项目ID
   * @returns 操作结果
   */
  deleteProject: async (id: string): Promise<{success: boolean; message: string}> => {
    try {
      const response = await fetch(`/api/settings/projects/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`删除项目失败: ${response.statusText}`);
      }
      
      return {
        success: true,
        message: '项目已成功删除'
      };
    } catch (error) {
      console.error('删除项目失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '删除项目失败'
      };
    }
  }
}; 