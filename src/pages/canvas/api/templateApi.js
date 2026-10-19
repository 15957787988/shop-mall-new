import request from './request'

export const templateApi = {
  categories: () => request.get({ url: '/canvas/templates/categories' }),
  list: (params = {}) =>
    request.get({
      url: '/canvas/templates',
      params: {
        current: params.current ?? 1,
        size: params.size ?? 20,
        categoryId: params.categoryId || undefined,
        keyword: params.keyword || undefined,
      },
    }),

  get: (id) =>
    request.get({ url: `/canvas/templates/${id}` }),

  clone: (id, name) =>
    request.post({
      url: `/canvas/templates/${id}/clone`,
      data: name ? { name } : {},
    }),
}
