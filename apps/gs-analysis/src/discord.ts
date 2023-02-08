import { Application } from "./application";
import { ActivityType, Client, GatewayIntentBits, Routes, REST, ChatInputCommandInteraction, Collection, Events, SlashCommandBuilder, ApplicationCommandOptionType } from "discord.js";
import { Config } from "./config";

interface Command {
    data: SlashCommandBuilder
    execute: (interaction: ChatInputCommandInteraction, app: Application) => Promise<void>
}

const commands: Command[] = [{
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!"),
    execute: async (interaction, _) => {
        await interaction.reply("Pong!");
    }
}, {
    data: new SlashCommandBuilder()
        .setName("echo")
        .setDescription("Echoes your message back!")
        .addStringOption(option => option
            .setName("input")
            .setDescription("The input that is echoed back!")
            .setRequired(true)
        ).addBooleanOption(option => option
            .setName("ephemeral")
            .setDescription("Message is ephemeral")
            .setRequired(true)) as SlashCommandBuilder,
    execute: async (interaction, _) => {
        const input = interaction.options.get("input");
        const ephemeral = interaction.options.get("ephemeral");
        await interaction.reply({ content: input!.value as string, ephemeral: ephemeral!.value as boolean });
    }
}, {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop the server with the given name!"),
    execute: async (interaction, app) => {

    }
}, {
    data: new SlashCommandBuilder()
        .setName("stop-if-needed")
        .setDescription("Stop all or given server(s) if needed!")
        .addStringOption(option => option
            .setName("servername")
            .setDescription("Servername")
            .setRequired(false)) as SlashCommandBuilder,
    execute: async (interaction, app) => {
        const input = interaction.options.get("servername");
        await interaction.deferReply();
        const serverName = input ? input.value as string : null
        await app.stopServersIfNeeded(serverName, 0);
        await interaction.editReply(serverName ? `Executed stop if needed for Server ${serverName}!` : "Executed stop if needed!");
    }
}];

const commandMap = new Collection<string, Command>();
commands.forEach((command) => {
    commandMap.set(command.data.name, command);
});

export const deployCommands = async (config: Config) => {
    const { botToken, applicationId, guildId } = config.discord;

    const rest = new REST({ version: "10" }).setToken(botToken);

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body: commands.map(c => c.data) });
        console.log('Successfully reloaded application (/) commands.');
    } catch (err) {
        console.error(err);
    }
}

export const createDiscordBot = (app: Application) => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages] });

    client.on("ready", () => {
        console.log(`Discord Bot logged in as ${client.user!.tag}! I'm on ${client.guilds.cache.size} guild(s)`);
        client.user!.setActivity({ name: "your messages", type: ActivityType.Watching });
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        const command = commandMap.get(interaction.commandName);
        if (!command) {
            interaction.reply("Unknown command!");
            return;
        }
        try {
            await command.execute(interaction, app);
        } catch (err) {
            console.error(err);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply("An Error accured during the command!");
            } else {
                await interaction.reply("An Error accured during the command!");
            }
        }
    });

    return client;
}