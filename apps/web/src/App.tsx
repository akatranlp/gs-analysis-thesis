import { useState } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "/api/"
})

import { StatusInfo } from "gs-analysis-types";
interface ServerStatus {
  lastStatusUpdate: Date
  statusGraph: Record<string, StatusInfo>
}

const getServerStatus = async () => {
  const response = await axiosInstance.get("servers");
  return response.data as ServerStatus;
}

interface ServerInfoProps {
  info: StatusInfo
  indent: number
}

const ServerInfo = ({ info, indent }: ServerInfoProps) => {
  return (
    <div className={`col-end-[-1] flex flex-row justify-between gap-5 ${indent === 0 ? "col-start-1" : indent === 2 ? "col-start-2" : "col-start-3"}`}>
      <div></div>
      <div>Name: {info.name}</div>
      <div>Inactive: {info.isInactive ? "inactive" : "active"}</div>
      <div>Status: {info.status}</div>
    </div>
  )
}

const RconServerInfo = ({ info, indent }: ServerInfoProps) => {
  const [rconCommand, setRconCommand] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit: React.FormEventHandler = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log(rconCommand);
  }

  return (
    <form onSubmit={onSubmit} className={`col-end-[-1] flex flex-row justify-between gap-5 ${indent === 0 ? "col-start-1" : indent === 2 ? "col-start-2" : "col-start-3"}`}>
      <div></div>
      <div>Name: {info.name}</div>
      <div>Inactive: {info.isInactive ? "inactive" : "active"}</div>
      <div>Status: {info.status}</div>
      <input disabled={isSubmitting} value={rconCommand} onChange={(e) => setRconCommand(e.currentTarget.value)} type={"text"} />
    </form>
  )
}

const App = () => {
  const queryClient = useQueryClient();
  const { data, isError, isLoading } = useQuery({ queryKey: ["serverStatus"], queryFn: getServerStatus, refetchInterval: 1000 });

  return (
    <div className="bg-blue-900 min-h-screen">
      <nav className="sticky top-0 p-5 text-xl mb-2 flex justify-start gap-5 bg-gray-700">
        <a className="cursor-pointer bg-blue-500 hover:bg-blue-300 focus:bg-blue-300 hover:text-black focus:text-black text-white rounded px-4 py-1" href="/">GS-Analysis</a>
        <a className="cursor-pointer bg-blue-500 hover:bg-blue-300 focus:bg-blue-300 hover:text-black focus:text-black text-white rounded px-4 py-1" href="/docs.html">Docs</a>
      </nav>
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-bold text-blue-200 mb-6">Hello Friends</h1>

        {data &&
          <div className="grid gap-5 grid-flow-row grid-cols-12 bg-slate-700">
            {Object.values(data.statusGraph).flatMap(root => {
              const component = <ServerInfo key={root.name} indent={0} info={root} />;

              const componentArray = root.childrenInfo && root.childrenInfo.flatMap(vm => {
                const component = vm.rcon ? <RconServerInfo key={vm.name} indent={2} info={vm} /> : <ServerInfo key={vm.name} indent={1} info={vm} />;

                const componentArray = vm.childrenInfo && vm.childrenInfo.map(gs => gs.rcon === true
                  ? <RconServerInfo key={gs.name} indent={2} info={gs} />
                  : <ServerInfo key={gs.name} indent={2} info={gs} />);

                return componentArray ? [component, ...componentArray] : [component];
              });

              return componentArray ? [component, ...componentArray] : [component];
            })}
          </div>
        }
      </div>
    </div>
  )
}

export default App;
