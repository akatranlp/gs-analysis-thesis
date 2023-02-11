export type ServerStatus = "starting" | "running" | "stopping" | "stopped"

export interface StatusInfo {
    status: ServerStatus
    isInactive: boolean
    name: string
    type: "hw" | "vm" | "gs"
    playerCount: number | null
    maxPlayers: number | null
    rcon: boolean | null
    childrenInfo: StatusInfo[] | null
    shutdownedServers: string[]
}
