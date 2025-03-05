import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, ShoppingCart, Trash2 } from 'lucide-react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const MARKETPLACE_ADDRESS = '0x54a898F830cA5d103F184939004AD5F9241CAaB7';
const PRDX_TOKEN_ADDRESS = '0x61Dd008F1582631Aa68645fF92a1a5ECAedBeD19';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const MARKETPLACE_ABI = [
  "function listToken(address tokenAddress, uint256 amountHuman, uint256 pricePerShareHuman, address paymentToken, bool referralActive, uint256 referralPercent, (string projectWebsite, string socialMediaLink, string tokenImageUrl, string telegramUrl, string projectDescription) metadata, uint256 durationInSeconds) external",
  "function buyToken(uint256 listingId, uint256 amountHuman, bytes32 referralCode) external",
  "function cancelListing(uint256 listingId) external",
  "function listingCount() external view returns (uint256)",
  "function getListingMainDetails(uint256 listingId) external view returns (address seller, address tokenAddress, uint256 amount, uint256 pricePerShare, address paymentToken, bool active, bool referralActive, uint256 referralPercent, bytes32 referralCode, uint256 endTime)",
  "function getListingMetadata(uint256 listingId) external view returns (string projectWebsite, string socialMediaLink, string tokenImageUrl, string telegramUrl, string projectDescription)",
  "function generateBuyerReferralCode(uint256 listingId) external returns (bytes32)"
];

const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function totalSupply() external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

async function getListings(provider: ethers.Provider) {
  try {
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
    const listingCount = await marketplace.listingCount();
    const listings = [];

    for (let i = 0; i < Number(listingCount); i++) {
      try {
        const [mainDetails, metadata] = await Promise.all([
          marketplace.getListingMainDetails(i),
          marketplace.getListingMetadata(i)
        ]);

        const token = new ethers.Contract(mainDetails.tokenAddress, TOKEN_ABI, provider);
        const [name, symbol] = await Promise.all([token.name(), token.symbol()]);

        const paymentToken = new ethers.Contract(mainDetails.paymentToken, TOKEN_ABI, provider);
        const paymentTokenSymbol = await paymentToken.symbol();

        listings.push({
          id: i,
          seller: mainDetails.seller,
          token: {
            address: mainDetails.tokenAddress,
            name,
            symbol,
            amount: mainDetails.amount.toString(),
            pricePerShare: mainDetails.pricePerShare.toString()
          },
          paymentToken: mainDetails.paymentToken,
          paymentTokenSymbol,
          active: mainDetails.active,
          endTime: Number(mainDetails.endTime)
        });
      } catch (error) {
        console.error(`Error processing listing ${i}:`, error);
      }
    }

    return listings;
  } catch (error: any) {
    console.error('Error getting listings:', error);
    throw new Error(`Failed to get listings: ${error.message}`);
  }
}

async function buyTokens(listingId: number, amount: string, signer: ethers.Signer, referralCode?: string) {
  try {
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
    const mainDetails = await marketplace.getListingMainDetails(listingId);

    const paymentToken = new ethers.Contract(mainDetails.paymentToken, TOKEN_ABI, signer);
    const paymentDecimals = await paymentToken.decimals();
    const totalCostRaw = ethers.parseUnits(
      (parseFloat(amount) * parseFloat(mainDetails.pricePerShare)).toString(),
      paymentDecimals
    );

    const userAddress = await signer.getAddress();
    const paymentBalance = await paymentToken.balanceOf(userAddress);
    if (paymentBalance < totalCostRaw) throw new Error('Insufficient payment token balance');

    const allowance = await paymentToken.allowance(userAddress, MARKETPLACE_ADDRESS);
    if (allowance < totalCostRaw) {
      console.log('Approving payment token...');
      const approveTx = await paymentToken.approve(MARKETPLACE_ADDRESS, ethers.MaxUint256);
      await approveTx.wait();
      console.log('Payment token approval confirmed');
    }

    const defaultReferralCode = ethers.encodeBytes32String('default_to_fee_recipient');
    const referralCodeBytes32 = referralCode ? ethers.encodeBytes32String(referralCode) : defaultReferralCode;

    console.log('Executing buyToken...');
    const tx = await marketplace.buyToken(listingId, amount, referralCodeBytes32);
    const receipt = await tx.wait();
    console.log('Purchase confirmed:', receipt.hash);
    return receipt;
  } catch (error: any) {
    console.error('Detailed error in buyTokens:', {
      message: error.message,
      reason: error.reason,
      data: error.data,
      code: error.code,
      transaction: error.transaction
    });
    throw new Error(`Failed to buy tokens: ${error.message}${error.reason ? ` - ${error.reason}` : ''}`);
  }
}

async function cancelListing(listingId: number, signer: ethers.Signer) {
  try {
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
    const tx = await marketplace.cancelListing(listingId);
    return await tx.wait();
  } catch (error: any) {
    throw new Error(`Failed to cancel listing: ${error.message}`);
  }
}

interface AllTokensPageProps {
  onClose: () => void;
  signer: ethers.Signer | null;
}

interface Listing {
  id: number;
  seller: string;
  token: { address: string; name: string; symbol: string; amount: string; pricePerShare: string };
  paymentToken: string;
  paymentTokenSymbol: string;
  active: boolean;
  endTime: number;
}

export default function AllTokensPage({ onClose, signer }: AllTokensPageProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  useEffect(() => {
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    loadListings(provider);
    const interval = setInterval(() => loadListings(provider), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchUserAddress = async () => {
      if (signer) {
        try {
          const address = await signer.getAddress();
          setUserAddress(address.toLowerCase());
        } catch (error) {
          console.error('Error retrieving user address:', error);
        }
      } else {
        setUserAddress(null);
      }
    };
    fetchUserAddress();
  }, [signer]);

  const loadListings = async (provider: ethers.Provider) => {
    try {
      const allListings = await getListings(provider);
      const currentTime = Math.floor(Date.now() / 1000);
      const activeListings = allListings.filter(
        (listing) => listing.active && listing.endTime > currentTime && parseFloat(listing.token.amount) > 0
      );
      setListings(activeListings);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load token listings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (listing: Listing) => {
    if (!signer) {
      toast.error('Please connect your wallet to buy tokens.');
      return;
    }
    if (!window.ethereum) {
      toast.error('Please install MetaMask or another wallet to buy tokens.');
      return;
    }
    
    const amount = prompt(`Enter the amount of ${listing.token.name} tokens to buy (max ${listing.token.amount}):`);
    if (!amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(listing.token.amount)) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      console.log(`Attempting to buy ${amount} tokens from listing ${listing.id}`);
      const receipt = await buyTokens(listing.id, amount, signer);
      console.log('Buy receipt:', receipt);
      toast.success('Purchase successful!');
      loadListings(new ethers.JsonRpcProvider('https://mainnet.base.org'));
    } catch (error: any) {
      console.error('Buy error:', error);
      toast.error(error.message || 'Failed to complete purchase');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (listingId: number) => {
    if (!signer) {
      toast.error('Please connect your wallet to cancel the listing.');
      return;
    }
    if (!window.ethereum) {
      toast.error('Please install MetaMask or another wallet to cancel the listing.');
      return;
    }

    try {
      setLoading(true);
      console.log(`Canceling listing ${listingId}`);
      const receipt = await cancelListing(listingId, signer);
      console.log('Cancel receipt:', receipt);
      toast.success('Listing cancelled successfully!');
      loadListings(new ethers.JsonRpcProvider('https://mainnet.base.org'));
    } catch (error: any) {
      console.error('Cancel error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = endTime - now;
    if (timeLeft <= 0) return "Expired";

    const days = Math.floor(timeLeft / (24 * 3600));
    const hours = Math.floor((timeLeft % (24 * 3600)) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);

    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      >
        <div className="bg-gray-800 backdrop-blur-sm rounded-xl p-6 shadow-lg max-w-md w-full">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading tokens...</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-gradient-to-b from-gray-900 to-black rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">All Real Estate Tokens</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </motion.button>
        </div>

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {listings.map((listing) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white/10 rounded-xl p-6 border border-white/10 shadow-lg hover:shadow-lg transition-shadow duration-300"
                whileHover={{ scale: 1.02 }}
              >
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-white">{listing.token.name}</h2>
                  <p className="text-sm text-gray-400">{listing.token.symbol}</p>
                </div>

                <div className="bg-white/5 p-4 rounded-lg mb-4">
                  <h3 className="text-md font-medium mb-2 text-white">Basic Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Available:</span>
                      <span className="text-white">{listing.token.amount} tokens</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price per token:</span>
                      <span className="text-white">{listing.token.pricePerShare} {listing.paymentTokenSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-gray-300">{listing.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time Remaining:</span>
                      <span className="text-gray-300">{getTimeRemaining(listing.endTime)}</span>
                    </div>
                  </div>
                </div>

                {signer && userAddress && (
                  <div className="flex space-x-4">
                    {listing.seller.toLowerCase() !== userAddress && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleBuy(listing)}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 transition-colors rounded-lg py-2 flex items-center justify-center text-white"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Buy Tokens
                      </motion.button>
                    )}
                    {listing.seller.toLowerCase() === userAddress && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCancel(listing.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 transition-colors rounded-lg py-2 flex items-center justify-center text-white"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Cancel Listing
                      </motion.button>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No tokens available.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}