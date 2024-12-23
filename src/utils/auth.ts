/**
 * 用于处理身份验证相关的工具函数
 */

/**
 * 编码 token payload
 * @param payload 需要编码的数据
 * @returns 编码后的字符串
 */
export const encodeTokenPayload = (payload: object): string => {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
};

/**
 * 解码 token payload
 * @param encodedPayload 编码后的字符串
 * @returns 解码后的数据
 */
export const decodeTokenPayload = (encodedPayload: string): any => {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encodedPayload))));
  } catch (error) {
    console.error('Token payload 解码失败:', error);
    return null;
  }
};

/**
 * 从 token 中提取用户信息
 * @param token JWT token
 * @returns 用户信息
 */
export const getUserFromToken = (token: string): any => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    return decodeTokenPayload(parts[1]);
  } catch (error) {
    console.error('Token 解析失败:', error);
    return null;
  }
};
