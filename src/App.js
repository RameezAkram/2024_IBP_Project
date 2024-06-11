
import React, { useState, useEffect } from 'react';
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import axios from 'axios';
import Spinner from 'react-bootstrap/Spinner';
import Navigation from './components/Navigation';
import NFT from './abis/NFT.json';
import config from './config.json';

const FILEBASE_API_KEY = "3B3AB9F6E4EDC53EEC6A";
const FILEBASE_API_ENDPOINT = "https://api.filebase.io/v1/ipfs";

const HUGGING_FACE_MODELS = {
  "Stable Diffusion 2": {
    url: "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2",
    key: "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"
  },
  "Stable Diffusion XL Base 1.0": {
    url: "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
    key: "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"
  }
};

function App() {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [nft, setNFT] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [url, setURL] = useState(null);
  const [message, setMessage] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Stable Diffusion 2");
  const [uploadedFile, setUploadedFile] = useState(null);

  const loadBlockchainData = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(provider);
    const network = await provider.getNetwork();
    const nft = new ethers.Contract(config[network.chainId].nft.address, NFT, provider);
    setNFT(nft);
  };

  const createImage = async () => {
    setMessage("Generating Image...");
    const model = HUGGING_FACE_MODELS[selectedModel];
    try {
      const response = await axios({
        url: model.url,
        method: 'POST',
        withCredentials: false,
        headers: {
          Authorization: `Bearer ${model.key}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          inputs: description,
          options: { wait_for_model: true },
        }),
        responseType: 'arraybuffer',
      });
      const type = response.headers['content-type'];
      const data = response.data;
      const base64data = Buffer.from(data).toString('base64');
      const img = `data:${type};base64,${base64data}`;
      setImage(img);
      setMessage("");
      return data;
    } catch (error) {
      console.error("Error generating image:", error);
      setMessage("Error generating image");
      return null;
    }
  };

  const uploadImage = async (imageData) => {
    setMessage("Uploading Image...");
    try {
      const formData = new FormData();
      formData.append('file', new Blob([imageData], { type: "image/jpeg" }), "image.jpeg");

      const response = await axios({
        url: `${FILEBASE_API_ENDPOINT}/upload`,
        method: 'POST',
        withCredentials: false,
        headers: {
          'x-api-key': FILEBASE_API_KEY,
          'Content-Type': 'multipart/form-data',
        },
        data: formData,
      });

      const url = `https://ipfs.filebase.io/ipfs/${response.data.cid}`;
      setURL(url);
      return url;
    } catch (error) {
      console.error("Error uploading image:", error);
      setMessage("Error uploading image");
      return null;
    }
  };

  const mintImage = async (tokenURI) => {
    setMessage("Waiting for Mint...");
    try {
      const signer = await provider.getSigner();
      const transaction = await nft.connect(signer).mint(tokenURI, { value: ethers.utils.parseUnits("1", "ether") });
      await transaction.wait();
    } catch (error) {
      console.error("Error minting image:", error);
      setMessage("Error minting image");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (name === "" || description === "") {
      window.alert("Please provide a name and description");
      return;
    }
    setIsWaiting(true);
    let imageData;
    if (uploadedFile) {
      imageData = uploadedFile;
    } else {
      imageData = await createImage();
      if (!imageData) {
        setIsWaiting(false);
        return;
      }
    }
    const url = await uploadImage(imageData);
    if (url) {
      await mintImage(url);
    }
    setIsWaiting(false);
    setMessage("");
  };

  useEffect(() => {
    loadBlockchainData();
  }, []);

  return (
    <div className="app-container" style={{ backgroundImage: `url('https://wallpapercave.com/wp/wp10721695.png')` }}>
      <Navigation account={account} setAccount={setAccount} />
      <div className='form'>
        <form onSubmit={submitHandler}>
          <input
            style={{
              padding: '10px',
              margin: '5px',
              borderRadius: '5px',
              border: '1px solid #ccc',
              fontSize: '16px',
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: '#e3f2fd', // Light blue background color
            }}
            type="text"
            placeholder="Create a name..."
            onChange={(e) => { setName(e.target.value) }}
          />

          <input
            style={{
              padding: '10px',
              margin: '5px',
              borderRadius: '5px',
              border: '1px solid #ccc',
              fontSize: '16px',
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: '#e3f2fd', // Light blue background color
            }}
            type="text"
            placeholder="Create a description..."
            onChange={(e) => setDescription(e.target.value)}
          />
          <select
            style={{
              padding: '10px',
              margin: '5px',
              borderRadius: '5px',
              border: '1px solid #ccc',
              fontSize: '16px',
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: '#e3f2fd', // Light blue background color
            }}
            onChange={(e) => setSelectedModel(e.target.value)}
            value={selectedModel}
          >
            <option value="Stable Diffusion 2">Stable Diffusion 2</option>
            <option value="Stable Diffusion XL Base 1.0">Stable Diffusion 1</option>
          </select>
            
          <p style={{ textAlign: 'center', margin: '10px 0' }}>OR</p>
  
          <input
            style={{
              padding: '10px',
              margin: '5px',
              borderRadius: '5px',
              border: '1px solid #ccc',
              fontSize: '16px',
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: '#e3f2fd', // Light blue background color
            }}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
          <input type="submit" value="Create & Mint" />
        </form>
        <div className="image">
          {isWaiting && (
            <div className="overlay">
              <Spinner className="spinner" animation="border" />
              <p>{message}</p>
            </div>
          )}
          {image && <img src={image} alt="AI generated" />}
        </div>
        {!isWaiting && url && (
          <p>
            View&nbsp;<a href={url} target="_blank" rel="noreferrer">Metadata</a>
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
