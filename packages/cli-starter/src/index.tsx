import "./polyfills.js"
import express from 'express';
import { Wallet } from "ethers";

import inquirer from 'inquirer';
import { Client } from "@xmtp/xmtp-js"
import { render, Text } from "ink"
import React from "react"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"

import { Message, MessageList, MessageStream } from "./renderers.js"
import {
  loadWallet,
  saveRandomWallet,
  truncateEthAddress,
  WALLET_FILE_LOCATION,
} from "./utils.js"

yargs(hideBin(process.argv))
  .command("launch", "Launch your agent", {}, async (argv) => {
    const { env } = argv
    const questions = [
      {
        type: 'list',
        name: 'wallet',
        message: 'You must connect your wallet to proceed',
        choices: ['Connect wallet', 'Cancel'],
      },
    ];
    const answers = await inquirer.prompt(questions);

    if (answers.wallet === 'Connect wallet') {
      const app = express();
      let walletConnected = false;

      app.get('/', (req, res) => {
        console.log('Home page is up, should have connect wallet');
        res.send(`
          <html>
            <body>
              <button id="connect">Connect Wallet</button>
              <script src="https://cdn.ethers.io/lib/ethers-5.0.umd.min.js"></script>
              <script type="module" src="https://unpkg.com/@xmtp/xmtp-js@11.2.1/dist/index.js"></script>
              <script>
                const ethers = window.ethers;
                document.getElementById('connect').addEventListener('click', async () => {
                  console.log('Connect button clicked');
                  if (window.ethereum) {
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    const provider = new ethers.providers.Web3Provider(window.ethereum);
                    const signer = provider.getSigner();
                    const client = await Client.create(signer, {skipContactPublishing: true, persistConversations: false});
                    const keys = await client.getKeys();
                    fetch('http://localhost:3000/keys', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(keys),
                    });
                  }
                });
              </script>
            </body>
          </html>
        `);
      });
    
      // app.get('/', (req, res) => {
      //   console.log('Home page is up, should have connect wallet');
      //   res.send(`
      //     <html>
      //       <body>
      //         <button id="connect">Connect Wallet</button>
      //         <script src="https://cdn.ethers.io/lib/ethers-5.0.umd.min.js"></script>
      //         <script>
      //           const ethers = window.ethers;
      //           document.getElementById('connect').addEventListener('click', async () => {
      //             console.log('Connect button clicked');
      //             if (window.ethereum) {
      //               await window.ethereum.request({ method: 'eth_requestAccounts' });
      //               const provider = new ethers.providers.Web3Provider(window.ethereum);
      //               const signer = provider.getSigner();
      //               // const address = await signer.getAddress();
      //               // console.log('This is trying /connect with address', address);
      //               // fetch('http://localhost:3000/connect?address=' + address);
      //               const provider = new ethers.providers.Web3Provider(window.ethereum);
      //               const signer = provider.getSigner();
      //               const client = await Client.create(signer, {skipContactPublishing: true, persistConversations: false});
      //               const keys = await client.getKeys();
      //               fetch('http://localhost:3000/keys', {
      //                 method: 'POST',
      //                 headers: {
      //                   'Content-Type': 'application/json',
      //                 },
      //                 body: JSON.stringify(keys),
      //               });
      //             }
      //           });
      //         </script>
      //       </body>
      //     </html>
      //   `);
      // });
      
      let walletAddress = null;
      
      app.get('/connect', (req, res) => {
        console.log('Got a request on /connect');
        walletConnected = true;
        walletAddress = req.query.address;
        console.log(`Wallet connected: ${walletAddress}`);

      
        res.send(`Wallet connected: ${walletAddress}`);
      });

      // app.get('/connect', async (req, res) => {
      //   console.log('Received request on /connect');
      //   walletConnected = true;
      //   walletAddress = req.query.address;
      
      //   if (typeof walletAddress === 'string') {
      //     // Create an ethers Wallet instance using the connected address
      //     // Note: This is a read-only wallet since we don't have the private key
      //     const wallet = new Wallet(walletAddress);
      
      //     // Generate the XMTP key bundle
      //     const keys = await Client.getKeys(wallet, {skipContactPublishing: true, persistConversations: false});
      
      //     console.log(`Successfully generated key bundle: ${JSON.stringify(keys)}`);
      
      //     res.send(`Wallet connected: ${walletAddress}`);
      //   } else {
      //     console.log('No wallet address provided');
      //     res.status(400).send('No wallet address provided');
      //   }
      // });

      app.post('/keys', (req, res) => {
        const keys = req.body;
        // Store the keys for later use
        console.log(`Keys: ${JSON.stringify(keys)}`)
      });
    
      const server = app.listen(3000, () => {
        console.log('Click on this link to connect your wallet: localhost:3000');
      });
    
      while (!walletConnected) {
        console.log('Waiting for wallet to connect...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    
      server.close();
      console.log('Successfully connected wallet');
    } else {
      console.log('Cancelled');
      process.exit(0);
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
