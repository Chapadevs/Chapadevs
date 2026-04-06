import api from './client'

export const ideaAPI = {
  generate: async (prompt) => {
    const { data } = await api.post('/ideas/generate', { prompt })
    return data
  },
  listMine: async () => {
    const { data } = await api.get('/ideas')
    return data
  },
  getById: async (id) => {
    const { data } = await api.get(`/ideas/${id}`)
    return data
  },
}
