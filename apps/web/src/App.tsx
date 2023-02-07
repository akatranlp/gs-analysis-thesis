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
  const response: ServerStatus = await axiosInstance.get("servers");
  return response;
}

function App() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["serverStatus"], queryFn: getServerStatus });

  return (
    <div className="App">
      <h1 className="text-3xl font-bold text-blue-600">Hello Friends</h1>
      {query.isLoading ?
        <p className="font-bold">Loading</p> :
        query.isError ?
          <p>Error{JSON.stringify(query.error)}</p> :
          JSON.stringify(query.data.statusGraph)}
    </div>
  )
}

export default App;
