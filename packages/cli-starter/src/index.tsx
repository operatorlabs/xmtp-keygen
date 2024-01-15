import "./polyfills.js"
import { Wallet } from "ethers";
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { Client } from "@xmtp/xmtp-js"
import { render, Text } from "ink"
import React from "react"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import dotenv from 'dotenv';
import { Message, MessageList, MessageStream } from "./renderers.js"
import {
  loadWallet,
  saveRandomWallet,
  truncateEthAddress,
  WALLET_FILE_LOCATION,
} from "./utils.js"

yargs(hideBin(process.argv))
  .command("launch", "Launch your agent", {}, async (argv) => {
    console.log('Please visit localhost:3000 and download your XMTP key bundle.');

    const questions = [
      {
        type: 'input',
        name: 'keyBundlePath',
        message: 'Provide the path to your downloaded key bundle',
      },
    ];
    const answers = await inquirer.prompt(questions);

    const keyBundlePath = path.resolve(answers.keyBundlePath);
    if (fs.existsSync(keyBundlePath)) {
      const keyBundleBinary = fs.readFileSync(keyBundlePath, 'utf-8');

      // Convert the binary string back into a Buffer
      const keyBundle = Buffer.from(keyBundleBinary, 'binary');
      console.log(`Key bundle: ${typeof (keyBundle)}`)

      const client = await Client.create(null, {
        env: "dev",
        privateKeyOverride: keyBundle
      });

      console.log('Successfully created XMTP client from file!');
      console.log('Generating .env file...');
      fs.appendFileSync('.env', `\nXMTP_KEY=${keyBundle.toString('base64')}`);

      // Load the .env file
      dotenv.config();

      // Create the client with the key bundle from the .env file
      if (process.env.XMTP_KEY) {
        const envKeyBundle = Buffer.from(process.env.XMTP_KEY, 'base64');
        const envClient = await Client.create(null, { 
          env: "dev", 
          privateKeyOverride: envKeyBundle 
        });
      
        console.log('Successfully generated client from environment variable.');
      } else {
        console.log('XMTP_KEY not found in environment variables');
      }

      const deleteQuestions = [
        {
          type: 'list',
          name: 'delete',
          message: `Delete ${keyBundlePath}?`,
          choices: ['Yes', 'No'],
        },
      ];
      const deleteAnswers = await inquirer.prompt(deleteQuestions);

      if (deleteAnswers.delete === 'Yes') {
        console.log(`Deleting file ${keyBundlePath}...`);
        fs.unlinkSync(keyBundlePath);
        console.log('Successfully deleted.');
      }
    } else {
      console.log('Invalid key bundle path');
    }
  })
  .command("init", "Initialize wallet", {}, async (argv) => {
    const { env } = argv
    saveRandomWallet()
    const client = await Client.create(loadWallet(), {
      env: env as "dev" | "production" | "local",
    })

    render(
      <Text>
        New wallet with address {client.address} saved at {WALLET_FILE_LOCATION}
      </Text>,
    )
  })
  .command(
    "send <address> <message>",
    "Send a message to a blockchain address",
    {
      address: { type: "string", demand: true },
      message: { type: "string", demand: true },
    },
    async (argv) => {
      const { env, message, address } = argv
      const client = await Client.create(loadWallet(), {
        env: env as "dev" | "production" | "local",
      })
      const conversation = await client.conversations.newConversation(address)
      const sent = await conversation.send(message)
      render(<Message msg={sent} />)
    },
  )
  .command(
    "list-messages <address>",
    "List all messages from an address",
    { address: { type: "string", demand: true } },
    async (argv) => {
      const { env, address } = argv
      const client = await Client.create(loadWallet(), {
        env: env as "dev" | "production" | "local",
      })
      const conversation = await client.conversations.newConversation(address)
      const messages = await conversation.messages()
      const title = `Messages between ${truncateEthAddress(
        client.address,
      )} and ${truncateEthAddress(conversation.peerAddress)}`

      render(<MessageList title={title} messages={messages} />)
    },
  )
  .command(
    "stream-all",
    "Stream messages coming from any address",
    {},
    async (argv) => {
      const { env } = argv
      const client = await Client.create(loadWallet(), {
        env: env as "dev" | "production" | "local",
      })
      const stream = await client.conversations.streamAllMessages()
      render(<MessageStream stream={stream} title={`Streaming all messages`} />)
    },
  )
  .command(
    "stream <address>",
    "Stream messages from an address",
    { address: { type: "string", demand: true } },
    async (argv) => {
      const { env, address } = argv // or message
      const client = await Client.create(loadWallet(), {
        env: env as "dev" | "production" | "local",
      })
      const conversation = await client.conversations.newConversation(address)
      const stream = await conversation.streamMessages()
      render(
        <MessageStream stream={stream} title={`Streaming conv messages`} />,
      )
    },
  )
  .option("env", {
    alias: "e",
    type: "string",
    default: "dev",
    choices: ["dev", "production", "local"] as const,
    description: "The XMTP environment to use",
  })
  .demandCommand(1)
  .parse()
