const playerCountCommands: Record<string, { command: string, outputConverter: (data: string) => number }> = {
    mc: {
        command: "list",
        outputConverter: (data) => {
            const value = data.match(/\d+/)?.[0]
            if (!value) throw new Error("outputValue not defined")
            return parseInt(value)
        }
    },
    tf2: {
        command: "users",
        outputConverter: (data) => {
            const value = data.split("\n").at(-2)?.match(/\d+/)?.[0]
            if (!value) throw new Error("outputValue not defined")
            return parseInt(value)
        }
    },
    conan: {
        command: "listplayers",
        outputConverter: (data) => {
            const value = data.split("\n").length
            return value ? value - 2 : 0
        }
    },
}

export default playerCountCommands;