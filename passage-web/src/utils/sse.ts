/**
 * SSE 工具函数
 */

export interface SSEMessage {
  type: string;
  data?: any;
  [key: string]: any;
}

export interface SSEOptions {
  onMessage: (message: SSEMessage) => void;
  onError?: (error: Event) => void;
  onComplete?: () => void;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) || "http://localhost:8567/api";

/**
 * 建立 SSE 连接
 */
export const connectSSE = (
  taskId: string,
  options: SSEOptions,
): EventSource => {
  const { onMessage, onError, onComplete } = options;

  const eventSource = new EventSource(
    `${API_BASE_URL}/article/progress/${taskId}`,
    {
      withCredentials: true,
    },
  );

  eventSource.onmessage = (event) => {
    try {
      const message: SSEMessage = JSON.parse(event.data);
      onMessage(message);

      // 检查是否完成
      if (message.type === "ALL_COMPLETE" || message.type === "ERROR") {
        eventSource.close();
        onComplete?.();
      }
    } catch (error) {
      console.error("SSE 消息解析失败:", error);
    }
  };

  eventSource.onerror = (error) => {
    console.warn("SSE 连接异常，等待自动重连:", error);
    onError?.(error);

    // 连接被服务端或浏览器最终关闭时，再回调完成
    if (eventSource.readyState === EventSource.CLOSED) {
      onComplete?.();
    }
  };

  return eventSource;
};

/**
 * 关闭 SSE 连接
 */
export const closeSSE = (eventSource: EventSource | null) => {
  if (eventSource) {
    eventSource.close();
  }
};
