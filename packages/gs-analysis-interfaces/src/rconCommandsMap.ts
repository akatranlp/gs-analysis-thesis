const playerCountCommands: Record<string, { command: string, outputConverter: (data: string) => number }> = {
    mc: {
        command: "list",
        outputConverter: (data) => {
            const value = data.match(/\d/)?.[0]
            if (!value) throw new Error("outputValue not defined")
            return parseInt(value)
        }
    },
    ttt: {
        command: "ttt_print_playercount",
        outputConverter: (data) => {
            console.log(data)
            return 0
        },
    },
    tf2: {
        command: "users",
        outputConverter: (data) => {
            const value = data.split("\n").at(-2)
            if (!value) throw new Error("outputValue not defined")
            return parseInt(value)
        }
    },
    conan: {
        command: "listplayers",
        outputConverter: (data) => {
            const value = data.match(/\n/)?.length
            return value ? value - 1 : 0
        }
    },
}

export default playerCountCommands;