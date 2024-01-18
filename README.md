# Generate your key bundle locally

Prerequisite: Have Metamask or another wallet app installed in your browser.

1. Clone this repo somewhere on your machine
2. Run npm install in the root directory of this repo
3. Go to localhost:3000 in your browser first, and make sure you get an error because there is nothing there
3. Run npm run dev. This will run the machine on localhost:3000
4. Go back to your browser and refresh the page for localhost:3000. You should see a button that says "Connect Wallet"
5. When you click connect wallet, if you haven't connected a wallet yet it will open a wallet app and ask you to connect. If you can only seem to connect one wallet and you want to connect a different one, you may be to manually do this in your wallet app. For example in the Metamask extension you can disconnect an address and connect another one. If you have issues with this step send us a message.
6. After you connect, you will see a button that says "Generate and Download XMTP Key Bundle"
7. Clicking the button will tell you to sign again in your wallet, this time to create an XMTP identity
8. Once you sign, you will be directed back to your browser and the key bundle will be downloaded
9. Follow the instructions on the screen to find your key bundle, and get the path to that file to use later
10. Navigate back to the CLI, it will ask for the path to the file. Put the path in and press enter


# --IGNORE EVERYTHING BELOW THIS LINE--

# Developer Quickstart

In this tutorial we are going to build a simple chat app using XMTP and NextJS. We are going to be chatting to a bot for simplicity. The bot is going to be a simple echo bot that will reply with the same message we send.

### NextJS Example

If you want to just clone the repo and get it working follow this commands. If you want to do it from scratch jump to the [#getting-started](#getting-started) section below.

[<div class="div-header-github-link"></div> xmtp-quickstart-nextjs](https://github.com/fabriguespe/xmtp-quickstart-nextjs)

```bash
git clone git@github.com:fabriguespe/xmtp-quickstart-nextjs.git
cd xmtp-quickstart-nextjs
npm install
npm run dev
```

### Getting started

The first step involves creating and configuring the Next.js application.

To generate a new Next.js app, execute the following command in your terminal:

```bash
npx create-next-app my-app

✔ Would you like to use TypeScript with this project? Yes
✔ Would you like to use ESLint with this project? Yes
✔ Would you like to use Tailwind CSS with this project?  Yes
✔ Would you like to use `src/` directory with this project? Yes
✔ Would you like to use experimental `app/` directory with this project? No
✔ Would you like to customize the default import alias? No
```

### Learning Objectives:

- Connect wallet button
- Authenticate with XMTP
- Create a conversation
- Sending a message
- Listen for messages

### Install dependencies

```bash
npm install @xmtp/xmtp-js ethers@5.7.0
```

### Connect wallet button

First we need to initialize XMTP client using as signer our wallet connection of choice.

```tsx
import Home from "@/components/Home";

export default function Index() {
  return <Home />;
}
```

```jsx
const connectWallet = async function () {
  // Check if the ethereum object exists on the window object
  if (typeof window.ethereum !== "undefined") {
    try {
      // Request access to the user's Ethereum accounts
      await window.ethereum.enable();

      // Instantiate a new ethers provider with Metamask
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      // Get the signer from the ethers provider
      setSigner(provider.getSigner());

      // Update the isConnected data property based on whether we have a signer
      setIsConnected(true);
    } catch (error) {
      console.error("User rejected request", error);
    }
  } else {
    console.error("Metamask not found");
  }
};
```

### Authenticate with XMTP

Now that we have the wrapper we can add a button that will sign our user in with XMTP.

```tsx
{
  isConnected && !isOnNetwork && (
    <div className={styles.xmtp}>
      <button onClick={connectWallet} className="btnXmtp">
        Connect Wallet
      </button>
      <button onClick={initXmtp} className={styles.btnXmtp}>
        Connect to XMTP
      </button>
    </div>
  );
}
```

```tsx
// Function to initialize the XMTP clients
const initXmtp = async function () {
  // Create the XMTP client
  const xmtp = await Client.create(signer, { env: "production" });
  //Create or load conversation with Gm bot
  newConversation(xmtp, PEER_ADDRESS);
  // Set the XMTP client in state for later use
  setIsOnNetwork(!!xmtp.address);
  //Set the client in the ref
  clientRef.current = xmtp;
};
```

### Create a conversation

```jsx
// Function to load the existing messages in a conversation
const newConversation = async function (xmtp_client, addressTo) {
  //Creates a new conversation with the address
  if (await xmtp_client?.canMessage(addressTo)) {
    //if you try with a non-enabled wallet is going to fail 0x1234567890123456789012345678901234567890
    const conversation = await xmtp_client.conversations.newConversation(
      addressTo,
    );
    convRef.current = conversation;
    //Loads the messages of the conversation
    const messages = await conversation.messages();
    setMessages(messages);
  } else {
    console.log("cant message because is not on the network.");
    //cant message because is not on the network.
  }
};
```

### Listen for messages

We are going to use the `useEffect` hook to listen to new messages.

```tsx
useEffect(() => {
  if (isOnNetwork && convRef.current) {
    // Function to stream new messages in the conversation
    const streamMessages = async () => {
      const newStream = await convRef.current.streamMessages();
      for await (const msg of newStream) {
        const exists = messages.find((m) => m.id === msg.id);
        if (!exists) {
          setMessages((prevMessages) => {
            const msgsnew = [...prevMessages, msg];
            return msgsnew;
          });
        }
      }
    };
    streamMessages();
  }
}, [messages, isOnNetwork]);
```

import Quickstarts from "@site/src/components/Quickstarts/index.md";

<Quickstarts />

#### Need to send a test message?

Message this XMTP message bot to get an immediate automated reply:

- `gm.xmtp.eth` (`0x937C0d4a6294cdfa575de17382c7076b579DC176`)

#### Troubleshooting

If you get into issues with `Buffer` and `polyfills` check out our fix below:

1. Install buffer dependency

```bash
npm i buffer
```

2. Create a new file `polyfills.js` in the root of your project

```tsx
import { Buffer } from "buffer";

window.Buffer = window.Buffer ?? Buffer;
```

3. Import it into your main file on the first line

- ReacJS: `index.js` or `index.tsx`
- VueJS: `main.js`
- NuxtJS: `app.vue`

```tsx
import "./polyfills";
```

4. Update config files

- Webpack: `vue.config.js` or `webpack.config.js`:

```jsx
const webpack = require("webpack");

module.exports = {
  configureWebpack: {
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
      }),
    ],
  },
  transpileDependencies: true,
};
```

- Vite: `vite.config.js`:

```jsx
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { Buffer } from "buffer";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    global: {
      Buffer: Buffer,
    },
  },
});
```

- NuxtJS: `nuxt.config.js`:

```tsx
export default {
  build: {
    extend(config, { isClient }) {
      if (isClient) {
        config.node = {
          Buffer: true,
        };
      }
    },
  },
};
```
