import { contextBridge } from 'electron'

/**
 * Ponte entre o renderer e o processo principal.
 * Vazia por enquanto: as funcoes expostas entram aqui.
 */
export const api = {}

contextBridge.exposeInMainWorld('api', api)
