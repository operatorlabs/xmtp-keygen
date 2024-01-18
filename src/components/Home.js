import { Client } from "@xmtp/xmtp-js";
import { ethers } from "ethers";
import React, { useState, useEffect } from "react";
import styles from "./Home.module.css"; // Import the CSS module

export default function Home() {
  const [signer, setSigner] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [keysDownloaded, setKeysDownloaded] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);

  function DownloadMessage({ walletAddress }) {
    return (
      <div className="contentContainer">
        <div className={styles.message}>
          <p className={styles.centerText}>
            Success!
            <br></br>
            <br></br>
            Check your Downloads folder for a file with {walletAddress} in the name.
          </p>
          <br />
          <p className={styles.centerText}>
            You can create a XMTP client from this file by adapting the code
            below. 
            <br></br>
            Please keep your key bundle secure by not exposing it unnecessarily.
          </p>
          <pre className={styles.codeBlock}>
            <code>
              {`
  import fs from 'fs';
  import { Client } from '@xmtp/xmtp-js'
  const keyBundlePath = 'path to your key bundle you downloaded'
  if (fs.existsSync(keyBundlePath)) {
    const keyBundleBinary = fs.readFileSync(keyBundlePath, 'utf-8');
    // Convert the binary string back into a Buffer
    const keyBundle = Buffer.from(keyBundleBinary, 'binary');
    const client = await Client.create(null, {
      env: "prod", // choose xmtp network here
      privateKeyOverride: keyBundle
    });
              `}
            </code>
          </pre>
          <br></br>
          <br></br>
          <p className={styles.centerText}>
            To re-connect your wallet or connect a different wallet, refresh
            this page.
          </p>
        </div>
      </div>
    );
  }

  // Connect the user's wallet
  const connectWallet = async function () {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.enable();
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        setSigner(signer);
        setIsConnected(true);
      } catch (error) {
        console.error("User rejected request", error);
      }
    } else {
      console.error("Metamask not found");
    }
  };

  // Use the connected wallet's signer to generate XMTP key bundle
  const generateKeys = async function () {
    if (signer) {
      const keys = await Client.getKeys(signer, {
        skipContactPublishing: true,
        persistConversations: false,
        env: "production"
      });
      const address = await signer.getAddress();
      setWalletAddress(address);
      downloadKeys(address, keys);
    }
  };

  // Convert the key bundle into text file that can be loaded later
  const downloadKeys = function (walletAddress, keys) {
    const ENCODING = "binary";
    const a = document.createElement("a");
    const data = new Blob([Buffer.from(keys).toString(ENCODING)], {
      type: "text/plain",
    });
    a.href = URL.createObjectURL(data);
    a.download = `${walletAddress}_XMTPbundle.txt`;
    a.click();
    setKeysDownloaded(true);
  };

  return (
    <div className={styles.Home}>
      {!keysDownloaded ? (
        <div className={styles.walletBtn}>
          {!isConnected ? (
            <button onClick={connectWallet} className={styles.btnXmtp}>
              Connect Wallet
            </button>
          ) : (
            <button onClick={generateKeys} className={styles.btnXmtp}>
              Generate and Download XMTP Key Bundle
            </button>
          )}
        </div>
      ) : (
        <DownloadMessage walletAddress={walletAddress} />
      )}
    </div>
  );
}
