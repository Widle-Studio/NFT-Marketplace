import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/router';
import axios from 'axios';
import Web3Modal from 'web3modal';
import { contractAddress, INFURA_URL, PINATA_KEY, PINATA_SECRET } from '../config';
import NFTMarketplace from '../abi/NFTMarketplace.json';
import Image from 'next/image';

export default function createNFT() {
    const [fileUrl, setFileUrl] = useState(null);
    const [formInput, updateFormInput] = useState({ price: '', name: '', description: '' });
    const router = useRouter();
    const [loadingState, setLoadingState] = useState('not-loading');

    async function imageUpload(e) {
        const file = e.target.files[0];

        try {
            const formData = new FormData();
            formData.append("file", file);

            const resFile = await axios({
                method: "post",
                url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
                data: formData,
                headers: {
                    'pinata_api_key': PINATA_KEY,
                    'pinata_secret_api_key': PINATA_SECRET,
                    'Content-type': 'multipart/form-data'
                }
            })

            const ImageURL = `https://gateway.pinata.cloud/ipfs/${resFile.data.IpfsHash}`;
            setFileUrl(ImageURL);
        } catch (error) {
            console.log(error);
        }
    }

    async function uploadToIPFS() {
        const { name, description, price } = formInput;
        if (!name || !description || !price || !fileUrl) return;
        setLoadingState('loading');

        try {
            var jsondata = JSON.stringify({
                "pinataMetadata": {
                    "name": `${name}.json`,
                },
                "pinataContent": {
                    name, description, image: fileUrl
                }
            })

            const resFile = await axios({
                method: "post",
                url: "https://api.pinata.cloud/pinning/pinJSONToIPFS",
                data: jsondata,
                headers: {
                    'pinata_api_key': PINATA_KEY,
                    'pinata_secret_api_key': PINATA_SECRET,
                    'Content-type': 'application/json'
                }
            });

            const tokenURI = `https://gateway.pinata.cloud/ipfs/${resFile.data.IpfsHash}`;
            return tokenURI;
        } catch (error) {
            console.log(error);
        }
    }

    async function listNFTForSale() {
        const url = await uploadToIPFS();
        const web3Modal = new Web3Modal();

        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const getnetwork = await provider.getNetwork();
        const goerliChailId = 5;

        if (getnetwork.chainId != goerliChailId) {
            alert("You are not connected to Goerli network");
        }
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, NFTMarketplace.abi, signer);
        const price = ethers.utils.parseUnits(formInput.price, 'ether');
        let listingPrice = await contract.getListingPrice();
        listingPrice = listingPrice.toString();
        let transaction = await contract.createToken(url,price,{value:listingPrice});
        await transaction.wait();
        router.push('/');
    }

    return (
        <div className='flex justify-center'>
            <div className='w-1/8 flex-col mr-10 mt-10'>
                {
                    !fileUrl && (
                        <Image className='rounded mt-4' src='/placeholder.png' width={300} height={200} />
                    )
                }
                {
                    fileUrl && (
                        <Image src={fileUrl} alt="Image uploaded successfully" width={300} height={200} placeholder="blur" blurDataURL='/placeholder.png' />
                    )
                }
            </div>
            <div className='w-1/2 flex flex-col'>
                <input placeholder='Assest Name' className='mt-8 border rounded p-4' onChange={e=>updateFormInput({...formInput, name: e.target.value})} />

                <textarea placeholder='Assest Description' className='mt-8 border rounded p-4' onChange={e=>updateFormInput({...formInput, description: e.target.value})} />

                <input placeholder='Assest Price in ETH' className='mt-8 border rounded p-4' type='number' onChange={e=>updateFormInput({...formInput, price: e.target.value})} />

                <input type='file' name='Asset' className='my-4' onChange={imageUpload} />

                {
                    fileUrl && (
                        <button onClick={listNFTForSale} className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg">
                            {loadingState == 'not-loading' ? 'Create NFT' : 'Wait uploading...'}
                        </button>
                    )
                }
            </div>
        </div>
    );
}