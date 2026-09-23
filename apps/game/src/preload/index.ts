import { contextBridge } from 'electron'

/**
 * Bridge between the renderer and the main process.
 * Empty for now: exposed functions go here.
 */
export const api = {}

contextBridge.exposeInMainWorld('api', api)
