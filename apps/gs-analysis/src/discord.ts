import { Application } from "./application";
import {
    ActivityType,
    Client, GatewayIntentBits,
    Routes, REST,
    ChatInputCommandInteraction,
    Collection,
    Events,
    SlashCommandBuilder,
    ChannelType,
    EmbedBuilder,
    SlashCommandSubcommandBuilder,
} from "discord.js";
import { Config } from "./config";
import { StatusInfo } from "gs-analysis-interfaces";

interface Command {
    data: SlashCommandBuilder
    execute: (interaction: ChatInputCommandInteraction, app: Application) => Promise<void>
}

const createCommands = (config: Config): Command[] => {
    return [{
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
            const input = interaction.options.getString("input", true);
            const ephemeral = interaction.options.getBoolean("ephemeral", true);
            await interaction.reply({ content: input, ephemeral });
        }
    }, {
        data: new SlashCommandBuilder()
            .setName("echo2")
            .setDescription("Echoes your message back!"),
        execute: async (interaction, _) => {
            await interaction.reply({ fetchReply: true, content: "What you want to echoed?", ephemeral: true });
            const message = await interaction.fetchReply();
            await interaction.followUp({ content: message.content, ephemeral: true });
        }
    }, {
        data: new SlashCommandBuilder()
            .setName("server")
            .setDescription("List or manage servers")
            .addSubcommandGroup(group => group
                .setName("manage")
                .setDescription("Manage servers")
                .addSubcommand(subcommand => subcommand
                    .setName("start")
                    .setDescription("Start server")
                    .addStringOption(option => option
                        .setName("servername")
                        .setDescription("Name of the server to start")
                        .setChoices(...config.servers.map(server => ({ name: server.name, value: server.name })))
                        .setRequired(true)))
                .addSubcommand(subcommand => subcommand
                    .setName("stop")
                    .setDescription("Stop server")
                    .addStringOption(option => option
                        .setName("servername")
                        .setDescription("Name of the server to stop")
                        .setChoices(...config.servers.map(server => ({ name: server.name, value: server.name })))
                        .setRequired(true)))
                .addSubcommand(subcommand => subcommand
                    .setName("stop-if-needed")
                    .setDescription("Stop all or given server(s) if needed!")
                    .addStringOption(option => option
                        .setName("servername")
                        .setDescription("Name of the server to start")
                        .setChoices(...config.servers.map(server => ({ name: server.name, value: server.name })))
                        .setRequired(false))))
            .addSubcommandGroup(group => group
                .setName("info")
                .setDescription("Get Server info")
                .addSubcommand(subcommand => subcommand
                    .setName("list")
                    .setDescription("List Server Info")
                    .addStringOption(option => option
                        .setName("servername")
                        .setDescription("Name of the server to start")
                        .setChoices(...config.servers.map(server => ({ name: server.name, value: server.name })))
                        .setRequired(false)))) as SlashCommandBuilder,
        execute: async (interaction, app) => {
            const group = interaction.options.getSubcommandGroup(true);
            const subcommand = interaction.options.getSubcommand(true);
            const serverName = interaction.options.getString("servername");
            console.log(group, subcommand, serverName);
            await interaction.deferReply({ ephemeral: true });
            if (group === "manage") {
                if (subcommand === "stop-if-needed") {
                    await app.stopServersIfNeeded(serverName, 0);
                    await interaction.editReply(serverName ? `Executed stop if needed for Server ${serverName}!` : "Executed stop if needed!");
                } else if (subcommand === "stop") {
                    await app.stopServer(serverName!);
                    await interaction.editReply(`${serverName!} is stopped now!`);
                } else if (subcommand === "start") {
                    console.log("server should starting", await app.startServer(serverName!));
                    await interaction.editReply(`${serverName!} is started now!`);
                }
            } else if (group === "info") {
                if (subcommand === "list") {
                    const info = await app.getServerStatusInfo(false, serverName);
                    const embed = produceReplyFromServerInfo(info);
                    await interaction.editReply({ embeds: [embed] });
                }
            }
        }
    }, {
        data: new SlashCommandBuilder()
            .setName("config")
            .setDescription("list or update config")
            .addSubcommand(subcommand => subcommand
                .setName("list")
                .setDescription("List the current config"))
            .addSubcommand(subcommand => subcommand
                .setName("update")
                .setDescription("update the current config")
                .addBooleanOption(option => option
                    .setName("shutdown-if-needed")
                    .setDescription("Update if the Application should shutdown the servers if needed")
                    .setRequired(false))
                .addNumberOption(option => option
                    .setName("interval")
                    .setDescription("The interval in which the Application checks the server")
                    .setRequired(false))
                .addIntegerOption(option => option
                    .setName("timeout")
                    .setDescription("The timeout in which a server is considered inactive")
                    .setMinValue(5)
                    .setMaxValue(60)
                    .setRequired(false))
            ) as SlashCommandBuilder,
        execute: async (interaction, app) => {
            const subcommand = interaction.options.getSubcommand(true);
            if (subcommand === "list") {
                await interaction.reply({ embeds: [new EmbedBuilder().setTitle("Config")], ephemeral: true })
            } else if (subcommand === "update") {
                const shutdownIfNeeded = interaction.options.getBoolean("shutdown-if-needed");
                const interval = interaction.options.getNumber("interval");
                const timeout = interaction.options.getInteger("timeout");
                if (shutdownIfNeeded != null) app.config.stopIfNeeded = shutdownIfNeeded;
                if (timeout != null) app.config.timeout = timeout;
                if (interval != null && interval >= 0.1 && interval < 5) app.config.interval = interval;
                await interaction.reply({ embeds: [new EmbedBuilder().setTitle("Config")], ephemeral: true });
            }
        }
    }]
}

const produceReplyFromServerInfo = (info: Record<string, StatusInfo>) => {
    const fields = Object.entries(info).map(([name, info]) => ({ name, value: `${name} is my name` }));


    return new EmbedBuilder()
        .setTitle("Server Status Info!")
        .addFields(fields)
}

export const deployCommands = async (config: Config) => {
    const { botToken, applicationId, guildId } = config.discord;
    const commands = createCommands(config);
    const rest = new REST({ version: "10" }).setToken(botToken);

    const body = commands.map(c => c.data.toJSON());

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body });
        console.log('Successfully reloaded application (/) commands.');
    } catch (err) {
        console.error(err);
    }
}

export const createDiscordBot = (app: Application) => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages] });

    const commands = createCommands(app.config);
    const commandMap = new Collection<string, Command>();
    commands.forEach((command) => {
        commandMap.set(command.data.name, command);
    });

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

    client.on(Events.MessageCreate, message => {
        if (message.channel.type != ChannelType.DM) return;

    });

    client.on("stop-if-needed", async () => {
        const channel = client.channels.cache.get(app.config.discord.channelId);
        if (!channel || channel.type != ChannelType.GuildText) return;
        await channel.send({ content: "Stop-if-needed" });
    });

    client.emit("stop-if-needed");

    return client;
}