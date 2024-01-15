// import { Client } from "@xmtp/xmtp-js";
// import { Wallet, ethers } from "ethers";
// import React, { useEffect, useState, useRef } from "react";
// import Chat from "./Chat";
// import styles from "./Home.module.css";

// const PEER_ADDRESS = "0xf499f581c805047f8cefd5575d4f940492f26cb1";

// export default function Home() {
//   const [messages, setMessages] = useState(null);
//   const convRef = useRef(null);
//   const clientRef = useRef(null);
//   const [signer, setSigner] = useState(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [isOnNetwork, setIsOnNetwork] = useState(false);

//   // Function to load the existing messages in a conversation
//   const newConversation = async function (xmtp_client, addressTo) {
//     //Creates a new conversation with the address
//     if (await xmtp_client?.canMessage(addressTo)) {
//       const conversation = await xmtp_client.conversations.newConversation(
//         addressTo,
//       );
//       convRef.current = conversation;
//       const messages = await conversation.messages();
//       setMessages(messages);
//     } else {
//       console.log("cant message because is not on the network.");
//       //cant message because is not on the network.
//     }
//   };

//   // Function to initialize the XMTP client
//   const initXmtp = async function () {
//     // Create the XMTP client
//     const xmtp = await Client.create(signer, { env: "production" });

//     // Cache the public XMTP key
//     const keys = await Client.getKeys(signer, {skipContactPublishing: true, persistConversations: false});
//     // const publicKey = keyBundle.publicKey;
//     // const privateKey = keyBundle.privateKey;
//     console.log(`KEYS: ${JSON.stringify(keys)}`);
//     // console.log(`PUBLIC: ${publicKey}`)
//     // console.log(`PRIVATE: ${privateKey}`)

//     //Create or load conversation with Gm bot
//     newConversation(xmtp, PEER_ADDRESS);
//     // Set the XMTP client in state for later use
//     setIsOnNetwork(!!xmtp.address);
//     //Set the client in the ref
//     clientRef.current = xmtp;
//   };

//   // Function to connect to the wallet
//   const connectWallet = async function () {
//     // Check if the ethereum object exists on the window object
//     if (typeof window.ethereum !== "undefined") {
//       try {
//         // Request access to the user's Ethereum accounts
//         await window.ethereum.enable();

//         // Instantiate a new ethers provider with Metamask
//         const provider = new ethers.providers.Web3Provider(window.ethereum);

//         // Get the signer from the ethers provider
//         const signer = provider.getSigner()
//         setSigner(signer);
//         const addr = await signer.getAddress();
//         console.log(`Signer: ${addr}`)

//         // Update the isConnected data property based on whether we have a signer
//         setIsConnected(true);
//       } catch (error) {
//         console.error("User rejected request", error);
//       }
//     } else {
//       console.error("Metamask not found");
//     }
//   };
//   useEffect(() => {
//     if (isOnNetwork && convRef.current) {
//       // Function to stream new messages in the conversation
//       const streamMessages = async () => {
//         const newStream = await convRef.current.streamMessages();
//         for await (const msg of newStream) {
//           const exists = messages.find((m) => m.id === msg.id);
//           if (!exists) {
//             setMessages((prevMessages) => {
//               const msgsnew = [...prevMessages, msg];
//               return msgsnew;
//             });
//           }
//         }
//       };
//       streamMessages();
//     }
//   }, [messages, isConnected, isOnNetwork]);

//   return (
//     <div className={styles.Home}>
//       {/* Display the ConnectWallet component if not connected */}
//       {!isConnected && (
//         <div className={styles.walletBtn}>
//           <button onClick={connectWallet} className={styles.btnXmtp}>
//             Connect Wallet
//           </button>
//         </div>
//       )}
//       {/* Display XMTP connection options if connected but not initialized */}
//       {isConnected && !isOnNetwork && (
//         <div className={styles.xmtp}>
//           {signer?.address}
//           <button onClick={initXmtp} className={styles.btnXmtp}>
//             Connect to XMTP
//           </button>
//         </div>
//       )}
//       {/* Render the Chat component if connected, initialized, and messages exist */}
//       {isConnected && isOnNetwork && messages && (
//         <Chat
//           client={clientRef.current}
//           conversation={convRef.current}
//           messageHistory={messages}
//         />
//       )}
//     </div>
//   );
// }

import { Client } from "@xmtp/xmtp-js";
import { ethers } from "ethers";
import React, { useState } from "react";
import styles from "./Home.module.css"; // Import the CSS module

export default function Home() {
  const [signer, setSigner] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Function to connect to the wallet
  const connectWallet = async function () {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.enable();
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner()
        setSigner(signer);
        setIsConnected(true);
      } catch (error) {
        console.error("User rejected request", error);
      }
    } else {
      console.error("Metamask not found");
    }
  };

  // Function to generate the XMTP key bundle
  const generateKeys = async function () {
    if (signer) {
      const keys = await Client.getKeys(signer, {skipContactPublishing: true, persistConversations: false});
      const address = await signer.getAddress();     
       downloadKeys(address, keys);
    }
  };

  // Function to download the XMTP key bundle
  const downloadKeys = function (walletAddress, keys) {
    const ENCODING = "binary";
    const a = document.createElement("a");
    const data = new Blob([Buffer.from(keys).toString(ENCODING)], {type: "text/plain"});
    a.href = URL.createObjectURL(data);
    a.download = `${walletAddress}_XMTPbundle.txt`;
    a.click();
  };

  return (
    <div className={styles.Home}> {/* Apply the CSS class to the div */}
      {!isConnected && (
        <div className={styles.walletBtn}> {/* Apply the CSS class to the div */}
          <button onClick={connectWallet} className={styles.btnXmtp}> {/* Apply the CSS class to the button */}
            Connect Wallet
          </button>
        </div>
      )}
      {isConnected && (
        <button onClick={generateKeys} className={styles.btnXmtp}> {/* Apply the CSS class to the button */}
          Generate and Download XMTP Key Bundle
        </button>
      )}
    </div>
  );
}