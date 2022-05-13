import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
// import errorImg from './assets/imgerror.webp'
import idl from './idl.json';
import './App.css';
import { Connection, PublicKey, clusterApiUrl ,Transaction, LAMPORTS_PER_SOL,sendAndConfirmTransaction} from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import kp from './keypair.json';
// error relating to buffer? import the following...
import { Buffer } from 'buffer';
window.Buffer = Buffer;


// 
// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data.
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
// you may use "finalized" to wait for the whole solana network to confirm the trx but in our case we only wait for the node we're connected to confirm(processed)...
const opts = {
  preflightCommitment: "processed"
}
// Constants

const TWITTER_HANDLE = 'CryptedO';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  // State
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);
  

  const displayAddress=(address)=>{
    let fullAddress = address.toString();
    let str1 = fullAddress.slice(0,4);
    let str2 = fullAddress.slice(39);
    let display = str1 + "..." + str2;
    return display;
  }

  // Actions
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            'Connected with Public Key:',
            response.publicKey.toString()
          );
        setWalletAddress(response.publicKey.toString());
          
        }
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;
  
    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  // SENDGIF
const sendGif = async () => {
  if (inputValue.length === 0) {
    console.log("No gif link given!")
    return
  }
  setInputValue('');
  console.log('Gif link:', inputValue);
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);

    await program.rpc.addGif(inputValue, {
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
      },
    });
    
    console.log("GIF successfully sent to program", inputValue)

    await getGifList();
  } catch (error) {
    console.log("Error sending GIF:", error)
  }
};

  // GETPROVIDER()
  const getProvider = () => {
  const connection = new Connection(network, opts.preflightCommitment);
  const provider = new Provider(
    connection, window.solana, opts.preflightCommitment,
  );
    console.log("this is the provider-->",provider);
	return provider;
}
  // a simpler getProvider()... use whichever you understand
const getProvider1 = async () => {
  if ("solana" in window) {
    const provider = window.solana;
    if (provider.isPhantom) {
      console.log("Is Phantom installed?  ", provider.isPhantom);
      return provider;
    }
  } else {
    window.open("https://www.phantom.app/", "_blank");
  }
};


  // get GIFList
  const getGifList = async() => {
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    const account = await           
    program.account.baseAccount.fetch(baseAccount.publicKey);
    var gifListLatest = account.gifList.reverse();
    setGifList(gifListLatest);
    
    
    console.log("Got the giflist===>", account.gifList)
  } catch (error) {
    console.log("Error in getGifList: ", error)
    setGifList(null);
  }
}
  
  // create gif account
  const createGifAccount = async () => {
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    console.log("ping");
    await program.rpc.startStuffOff({
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [baseAccount]
    });
    console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString());
    await getGifList();

  } catch(error) {
    console.log("Error creating BaseAccount account:", error)
  }
}
  

  // tip a gif
  const tipGif = async(toAddr, amount)=>{
       // Detecing and storing the phantom wallet of the user (creator in this case)
    var provider = await getProvider1();
    console.log("Public key of the emitter: ",provider.publicKey.toString());

    // Establishing connection
    var connection = new Connection(network, opts.preflightCommitment);

    // I have hardcoded my secondary wallet address here. You can take this address either from user input or your DB or wherever
    var recieverWallet = new PublicKey(toAddr);

    var transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: recieverWallet,
        lamports: LAMPORTS_PER_SOL * amount//Investing 1 SOL. Remember 1 Lamport = 10^-9 SOL.
      }),
    );

    // Setting the variables for the transaction
    transaction.feePayer = await provider.publicKey;
    let blockhashObj = await connection.getRecentBlockhash();
    transaction.recentBlockhash = await blockhashObj.blockhash;
   

    // Transaction constructor initialized successfully
    if(transaction) {
      console.log("Txn created successfully");
    }
    
    // Request creator to sign the transaction (allow the transaction)
    let signed = await provider.signTransaction(transaction);
    // The signature is generated
    let signature = await connection.sendRawTransaction(signed.serialize());
    // Confirm whether the transaction went through or not
    await connection.confirmTransaction(signature);

    //Signature 
    console.log("Signature: ", signature);
  }
 

  // check the gif link if it's valid...
    // const checkGifLink = ()=>{
    //   console.log('==========checking the link now...');
    //   setImgsrc(inputValue);
    //   setGifPreview(true);
    //   var image = document.getElementById('MyGif');
    //   console.log('===check continues...');
    //   // var image = new Image();
    //   image.onerror = function () {
        
    //     console.log('we ran into an error...');
    //     setGifPreview(false);
    //   };
    //   image.onload = function () {
    //     // image.src = imgSrc;
    //     console.log('image loaded successfully...');
    //     setImgsrc(inputValue);
    //     setDisplayBtn(true); 
        
    //   };
    //   console.log('===>check ended<=====...');
    //   // image.src = imgSrc;
    // }
  
  // RENDER NOT WHEN CONNECTED
  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  
  
  const renderConnectedContainer = () => {
// If we hit this, it means the program account hasn't been initialized.
  if (gifList === null) {
    return (
      <div className="connected-container">
        
        <button className="cta-button submit-gif-button" onClick={createGifAccount}>
          Do One-Time Initialization For GIF Program Account
        </button>
      </div>
    )
  } 
	// Otherwise, we're good! Account exists. User can submit GIFs.
    
    
	else {
    return(
      <div className="connected-container">
        
        <form
          onSubmit={(event) => {
            event.preventDefault();
            
            if(inputValue == '' ) return alert('please enter a valid gif link!');
            sendGif();
            // setImgsrc(inputValue);
            // checkGifLink();
          }}
        >
          <input
            type="text"
            placeholder="Enter gif link!"
            value={inputValue}
            onChange={(e)=>setInputValue(e.target.value)}
          />
          <button type="submit" className="cta-button submit-gif-button">
            Submit
          </button>
        </form>
        
        <div className="gif-grid">
					{/* We use index as the key instead, also, the src is now item.gifLink */}
          {gifList.map((item, index) => (
            <div className="gif-item" key={index}>
              <img src={item.gifLink} />
              <div className="post-details">
              <h4 className="post_author">{displayAddress(item.userAddress)}</h4>
                {
                  walletAddress == item.userAddress.toString()?null:(
                    <button type="button"className="tip-btn cta-button connect-wallet-button" onClick={()=>
                  tipGif(item.userAddress.toString(), 0.05)
                  }>Tip this Gif</button>
                  ) 
                }
              
              </div>
        
            </div>
          ))}
        </div>
      </div>
    )
  }
}

  // UseEffects
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

useEffect(() => {
  if (walletAddress) {
    console.log("wallet address===>", walletAddress);
    console.log('Fetching GIF list...');
    getGifList();
  }
}, [walletAddress]);
  
  return (
    <div className="App">
      {
        walletAddress&&(
          <nav className="top-nav">
          <span className="left">
              CryptedO
          </span>
          <span className="connected-wallet">
              {displayAddress(walletAddress)}
          </span>
        </nav>
        )
      }
			{/* This was solely added for some styling fanciness */}
			<div className={walletAddress ? 'authed-container' : 'container'}>
        
        <div className="header-container">
          <p className="header">🖼 WINNIE GIF Portal</p>
          <p className="sub-text">
            View your winnie GIF collection in the metaverse ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
        {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;