import { useState, createContext, useContext, useEffect, useCallback } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query'

import axios from "axios";
import { StatusInfo } from "gs-analysis-types";
import { useLocalStorage } from './hooks';

const axiosInstance = axios.create({
  baseURL: "/api/"
});

type Props = {
  children?: React.ReactNode
};

interface RconMessage {
  command: string
  servername: string
  response: string
}

interface AppContext {
  errors: Error[],
  addError: (error: Error) => void,
  removeError: (error: Error) => void
  rconMessages: RconMessage[]
  addRconMessage: (message: RconMessage) => void
  removeRconMessage: (message: RconMessage) => void
}

const AppContext = createContext<AppContext>({
  errors: [],
  addError: () => { },
  removeError: () => { },
  rconMessages: [],
  addRconMessage: () => { },
  removeRconMessage: () => { }
});

export const AppContextProvider: React.FC<Props> = ({ children }) => {
  const [errors, setErrors] = useState<Error[]>([]);

  const { value: rconMessages, setValue: setRconMessages } = useLocalStorage<RconMessage[]>("rconMessages", []);

  const addError = (err: Error) => setErrors(prev => [err, ...prev]);
  const removeError = (err: Error) => setErrors((prev) => prev.filter(e => e !== err));

  const addRconMessage = (message: RconMessage) => setRconMessages(prev => prev ? [message, ...prev] : [message]);
  const removeRconMessage = (message: RconMessage) => setRconMessages(prev => prev?.filter(e => e !== message) || []);

  return (
    <AppContext.Provider value={{
      errors,
      addError,
      removeError,
      rconMessages: rconMessages || [],
      addRconMessage,
      removeRconMessage
    }}>
      {children}
    </AppContext.Provider>
  )
}

interface ServerStatus {
  lastStatusUpdate: Date
  statusGraph: StatusInfo[]
  shutdownedServers: string[]
}

const getServerStatus = async () => {
  const response = await axiosInstance.get("servers");
  return response.data as ServerStatus;
}

interface ServerInfoProps {
  info: StatusInfo
}

const RecursiveStatusElement: React.FC<ServerInfoProps> = ({ info }) => {
  const queryClient = useQueryClient();
  const [rconCommand, setRconCommand] = useState("");
  const { addRconMessage, addError } = useContext(AppContext);

  const sendRconCommandMutation = useMutation({
    mutationFn: (command: string) => axiosInstance.post<{ result: string }>(`servers/${info.name}/rcon`, { command }),
    onSuccess: (data) => {
      addRconMessage({
        command: rconCommand,
        response: data.data.result,
        servername: info.name
      });
    }
  });

  const startStopServerMutation = useMutation({
    mutationFn: (starting: boolean) => axiosInstance.put<boolean>(`servers/${info.name}`, { state: starting ? "start" : "stop" }, { timeout: 2 * 60 * 1000 }),
    onError: (e: any) => {
      addError(e);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["serverStatus"] });
    },
  })

  const onSubmit: React.FormEventHandler = (e) => {
    e.preventDefault();
    setRconCommand("");
    sendRconCommandMutation.mutate(rconCommand);
  }

  const startStopButton = () => {
    const starting = info.status === "stopped";
    startStopServerMutation.mutate(starting);
  }

  return (
    <>
      <div className="p-2 rounded bg-slate-800 text-center text-white">{info.type === "hw" ? "Hardware" : info.type === "vm" ? "VM" : "Gameserver"}</div>
      <div className="font-bold text-center rounded bg-blue-500 text-white p-2">{info.name}</div>
      <div className={`text-center flex flex-row justify-around rounded text-white p-2 ${info.status === "running" ? "bg-green-700" : info.status === "stopped" ? "bg-red-800" : "bg-orange-600"}`}>
        <div>{info.status}</div>
        <button className={`rounded-full ${info.status === "stopped" ? "text-green-500" : "text-red-600"} `}
          onClick={startStopButton}
          disabled={startStopServerMutation.isLoading || info.status === "starting" || info.status === "stopping"}
        >
          &#128280;
        </button>
      </div>
      {info.status !== "running" ?
        <div></div> :
        <div className={`rounded text-center p-2 text-white ${info.isInactive ? "bg-red-800" : "bg-green-700"}`}>{info.isInactive ? "inactive" : "active"}</div>
      }
      {info.type === "gs" ?
        <div className="text-white appearance-none rounded bg-gray-500 text-center p-2">{info.playerCount!}</div> :
        <div></div>
      }
      {info.rcon === true ?
        <form className="relative flex" onSubmit={onSubmit}>
          <div className="text-black text-lg absolute left-2 top-[50%] translate-y-[-50%]">{">"}</div>
          <div className="bg-slate-300 rounded-l w-5"></div>
          <input className="rounded-r bg-slate-300 text-black p-2" disabled={sendRconCommandMutation.isLoading} value={rconCommand} onChange={(e) => setRconCommand(e.currentTarget.value)} type={"text"} />
        </form> :
        <div></div>
      }
      {info.childrenInfo && info.childrenInfo.map(e => <RecursiveStatusElement key={e.name} info={e} />)
      }
    </>
  )
}

const ErrorMessage: React.FC<{ error: Error }> = ({ error }) => {
  const { removeError } = useContext(AppContext);

  return (
    <div className="relative w-[1000px] p-3 rounded bg-red-600">
      <div className="text-xl text-white font-bold text-center">{error.message}</div>
      <button className="absolute top-0 right-1 text-white" onClick={() => removeError(error)}>&#x2715;</button>
    </div>
  )
}

const RconMessage: React.FC<{ message: RconMessage }> = ({ message }) => {
  const { removeRconMessage } = useContext(AppContext);

  return (
    <div className="relative w-[1000px] p-3 rounded bg-blue-500 flex flex-row justify-around">
      <div className="text-xl text-white font-bold text-center">{message.servername}</div>
      <div className="text-xl text-white font-bold text-center">{message.command}</div>
      <div className="text-xl text-white font-bold text-center">{message.response}</div>
      <button className="absolute top-0 right-1 text-white" onClick={() => removeRconMessage(message)}>&#x2715;</button>
    </div>
  )
}

const ShutdownedServersMessage: React.FC<{ servers: string[], setShutdownedServersMessages: (cb: ((prev: string[][]) => string[][])) => void }> =
  ({ servers, setShutdownedServersMessages }) => {
    const removeMessage = () => {
      setShutdownedServersMessages(prev => prev.filter(e => e !== servers))
    }

    return (
      <div className="relative p-3 flex justify-center bg-blue-700 gap-3">
        {servers.map(server => <div key={server}>{server}</div>)}
        <button className="absolute top-0 right-1 text-white" onClick={removeMessage}>&#x2715;</button>
      </div>
    )
  }

const App: React.FC = () => {
  const { errors, rconMessages } = useContext(AppContext);
  const queryClient = useQueryClient();

  const [shutdownedServers, setShutdownedServers] = useState<string[]>([]);
  const [shutdownedServersMessages, setShutdownedServersMessages] = useState<string[][]>([]);

  const { data, isError, isLoading } = useQuery({
    queryKey: ["serverStatus"],
    queryFn: getServerStatus,
    refetchInterval: 5000,
    onSuccess: (data) => {
      if (data.shutdownedServers.length == 0) setShutdownedServers([]);
      if (data.shutdownedServers.every(entry => entry in shutdownedServers)) return;
      setShutdownedServers(data.shutdownedServers);
    }
  });

  useEffect(() => {
    if (shutdownedServers.length === 0) return;
    setShutdownedServersMessages(prev => [shutdownedServers, ...prev]);
  }, [shutdownedServers, setShutdownedServersMessages]);

  const stopIfNeededMutation = useMutation({
    mutationFn: () => axiosInstance.put("servers", { state: "stopin" }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["serverStatus"] });
    },
  });

  return (
    <div className="bg-slate-800 min-h-screen text-sm">
      <nav className="p-5 text-xl mb-5 flex justify-center relative gap-5 bg-gray-700">
        <a className="cursor-pointer text-4xl text-white" href="/">GS-Analysis</a>
        <a className="absolute font-lg right-4 top-[50%] translate-y-[-50%] cursor-pointer bg-blue-500 hover:bg-blue-300 focus:bg-blue-300 hover:text-black focus:text-black text-white rounded px-4 py-1" href="/docs.html">Docs</a>
      </nav>
      <div className="flex flex-col items-center">
        {errors.length > 0 &&
          <div className="flex flex-col gap-3 mb-3">
            {errors.map((e, index) => <ErrorMessage key={index} error={e} />)}
          </div>
        }
        {shutdownedServersMessages.length > 0 &&
          <div className="mb-3 bg-blue-900 text-white w-[1000px] flex flex-col gap-3 p-3 text-center">
            <div className="font-bold text-lg">Shutdowned Servers:</div>
            {shutdownedServersMessages.map((e, index) => <ShutdownedServersMessage key={index} servers={e} setShutdownedServersMessages={setShutdownedServersMessages} />)}
          </div>
        }
        <h1 className="text-3xl font-bold text-blue-200 mb-6">Status Table</h1>
        {data &&
          <div className="rounded bg-slate-700 grid grid-flow-row gap-5 justify-center items-center grid-cols-6 p-5 mb-5">
            <div className="text-white text-center font-bold">Type</div>
            <div className="text-white text-center font-bold">Name</div>
            <div className="text-white text-center font-bold">State</div>
            <div className="text-white text-center font-bold">Inactive State</div>
            <div className="text-white text-center font-bold">PlayerCount</div>
            <div className="text-white text-center font-bold">Rcon-Commands</div>
            {data.statusGraph.map(root => <RecursiveStatusElement key={root.name} info={root} />)}
            <button disabled={stopIfNeededMutation.isLoading} className="col-start-1 col-end-[-1] bg-slate-500 text-white text-2xl p-2 rounded" onClick={() => stopIfNeededMutation.mutate()}>Stop Servers If Needed</button>
          </div>
        }
        {rconMessages.length > 0 &&
          <div className="flex flex-col items-center gap-2">
            {rconMessages.map((e, index) => <RconMessage key={index} message={e} />)}
          </div>
        }
      </div>
    </div>
  )
}

export default App;
