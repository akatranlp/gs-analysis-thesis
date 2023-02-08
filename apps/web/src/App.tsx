import { useState } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:3000/api/"
})

import { StatusInfo } from "gs-analysis-interfaces";
interface ServerStatus {
  lastStatusUpdate: Date
  statusGraph: Record<string, StatusInfo>
}

const getServerStatus = async () => {
  const response = await axiosInstance.get("servers");
  return response.data as ServerStatus;
}

const RenderStatusInfo = ({ info }: { info: StatusInfo }): JSX.Element => {
  return (
    <div className="border border-black p-5">
      <div>
        <div>Name: {info.name}</div>
        <div>isInactive: {info.isInactive ? "inactive" : "active"}</div>
        <div>isOnline: {info.isOnline ? "online" : "offline"}</div>
        {info.playerCount != null && <div>PlayerCount: {info.playerCount}</div>}
        {info.maxPlayers != null && <div>MaxPlayerCount: {info.maxPlayers}</div>}
        {info.rcon != null && <div>Rcon: {info.rcon}</div>}
      </div>
      <div>
        {info.childrenInfo && info.childrenInfo.map(entry => <RenderStatusInfo info={entry} />)}
      </div>
    </div>
  )
}

const App = () => {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["serverStatus"], queryFn: getServerStatus });

  return (
    <div className="flex flex-col gap-3 justify-center items-center">
      <h1 className="text-3xl font-bold text-blue-600">Hello Friends</h1>
      {query.data && <>
        <div>{new Date(query.data.lastStatusUpdate).toLocaleString("de-DE")}</div>
        <div>{Object.values(query.data.statusGraph).map(entry => <RenderStatusInfo info={entry} />)}</div>
      </>
      }
    </div>
  )
}

export default App;
