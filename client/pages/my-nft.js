import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/router';
import axios from 'axios';
import Web3Modal from 'web3modal';
import { contractAddress, INFURA_URL } from '../config';
import NFTMarketplace from '../abi/NFTMarketplace.json';
import Image from 'next/image';

export default function MyNFTs() {
    const [nfts, setNfts] = useState([]);
    const [loadingState, setLoadingState] = useState('not-loaded');
    const router = useRouter();

    useEffect(() => {
        loadNFTs();
    }, []);

    async function loadNFTs() {
        const web3Modal = new Web3Modal();

        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const getnetwork = await provider.getNetwork();
        const goerliChailId = 5;

        if (getnetwork.chainId != goerliChailId) {
            alert("You are not connected to Goerli network");
        }
        const signer = provider.getSigner();
        const marketplaceContract = new ethers.Contract(contractAddress, NFTMarketplace.abi, signer);
        const data = await marketplaceContract.fetchMyNFTs();
        const items = await Promise.all(data.map(async i => {
            let price = ethers.utils.formatUnits(i.price.toString(), 'ether');
            const tokenURI = await marketplaceContract.tokenURI(i.tokenId);
            const meta = await axios.get(tokenURI);

            let item = {
                price,
                tokenId: i.tokenId.toNumber(),
                seller: i.seller,
                owner: i.owner,
                name: meta.data.name,
                image: meta.data.image,
                description: meta.data.description,
                tokenURI
            };

            return item;
        }));

        setNfts(items);
        setLoadingState('loaded');
    }

    async function resellNFT(tokenId, tokenPrice) {
        setLoadingState('not-loaded');
        const web3Modal = new Web3Modal();
        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();
        const marketplaceContract = new ethers.Contract(contractAddress, NFTMarketplace.abi, signer);
        const price = ethers.utils.parseUnits(tokenPrice, 'ether');
        let listingPrice = await marketplaceContract.getListingPrice();
        listingPrice = listingPrice.toString();
        const transaction = await marketplaceContract.resellToken(tokenId, price, { value: listingPrice });
        await transaction.wait();
        loadNFTs();
    }

    if (loadingState == 'not-loaded') return (
        <h1 className=' px-20 py-10 text-3xl'>wait... loading</h1>
    )
    if (loadingState == 'loaded' && !nfts.length) return (
        <h1 className=' px-20 py-10 text-3xl'>No NFTs owned by you</h1>
    )

    return (
        <div className='flex justify-center'>
            <div className='px-4' style={{ maxWidth: '1600px' }}>
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 pt-4'>
                    {
                        nfts.map((nft, i) => (

                            <div key={i} className='border shadow rounded-xl overflow-hidden mr-4 mx-5 my-5'>
                                <Image src={nft.image ? nft.image : '/placeholder.png'} alt={nft.name} width={300} height={200} placeholder="blur" blurDataURL='/placeholder.png' layout='responsive' />
                                <div className='p-4'>
                                    <p style={{ height: '64px' }} className="text-2xl font-semibold">{nft.name}</p>
                                    <div style={{ height: '70px', overflow: 'hidden' }}>
                                        <p className='text-gray-400'>{nft.description}</p>
                                    </div>
                                </div>
                                <div className='p-4 bg-black'>
                                    <p className='text-2xl mb-4 font-bold text-white'>{nft.price} ETH</p>
                                    <button disabled={nft.image ? '' : 'disabled'} className='w-full bg-red-500 text-white font-bold py-2 px-12 rounded' onClick={() => resellNFT(nft.tokenId, nft.price)}>Resell NFT</button>
                                </div>
                            </div>

                        ))
                    }
                </div>
            </div>
        </div>
    );
}