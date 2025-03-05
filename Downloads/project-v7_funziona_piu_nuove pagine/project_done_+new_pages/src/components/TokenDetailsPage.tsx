import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Globe, Twitter, MessageCircle, ShoppingCart, Trash2, Copy } from 'lucide-react';
import { ethers } from 'ethers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
          projectWebsite: metadata.projectWebsite,
          socialMediaLink: metadata.socialMediaLink,
          imageUrl: metadata.tokenImageUrl,
          websiteUrl: metadata.projectWebsite,
          twitterUrl: metadata.socialMediaLink,
          telegramUrl: metadata.telegramUrl,
          projectDescription: metadata.projectDescription,
          referralActive: mainDetails.referralActive,
          referralPercent: Number(mainDetails.referralPercent),
          referralCode: mainDetails.referralCode,
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

interface TokenDetailsPageProps {
  signer: ethers.Signer | null;
}

interface Listing {
  id: number;
  seller: string;
  token: { address: string; name: string; symbol: string; amount: string; pricePerShare: string };
  paymentToken: string;
  paymentTokenSymbol: string;
  active: boolean;
  projectWebsite: string;
  socialMediaLink: string;
  imageUrl: string;
  websiteUrl: string;
  twitterUrl: string;
  telegramUrl: string;
  projectDescription: string;
  referralActive?: boolean;
  referralPercent?: number;
  referralCode?: string;
  endTime: number;
}

export default function TokenDetailsPage({ signer }: TokenDetailsPageProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  useEffect(() => {
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org'); // Public provider
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
      toast.error(error.message || 'Failed to load token details. Please try again later.');
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

  const copyToClipboard = async (text: string, message: string = 'Copied to clipboard!') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const generateBarChartData = (listingId: number) => {
    const data = [];
    const basePrice = parseFloat(listings.find((l) => l.id === listingId)?.token.pricePerShare || '0');
    for (let i = 0; i < 8; i++) { // Kept at 8 hours for compactness
      const price = basePrice + (Math.random() - 0.5) * 0.1 * basePrice;
      const volume = Math.floor(Math.random() * 3000); // Kept reduced volume
      data.push({
        time: `${i}:00`,
        price,
        volume,
      });
    }
    return data;
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4"
      >
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg max-w-md w-full">
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto"></div>
            <p className="mt-3 text-gray-400">Loading token details...</p>
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
      className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900 text-white p-4"
    >
      <div className="container mx-auto max-w-4xl">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-2xl font-bold text-white">Token Details</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.history.back()} // Ensures the close button (X) is functional
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map((listing) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white/10 rounded-xl p-3 border border-white/10 shadow-lg hover:shadow-lg transition-shadow duration-300"
                whileHover={{ scale: 1.02 }}
              >
                <div className="mb-2">
                  {listing.imageUrl && (
                    <img
                      src={listing.imageUrl}
                      alt={listing.token.name}
                      className="w-full h-20 object-cover rounded-lg mb-2"
                    />
                  )}
                  <h2 className="text-lg font-semibold text-white">
                    {listing.token.name}
                  </h2>
                  <p className="text-sm text-gray-400">{listing.token.symbol}</p>
                </div>

                <div className="bg-white/5 p-2 rounded-lg mb-2">
                  <h3 className="text-sm font-medium mb-1 text-white">
                    Token Information
                  </h3>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Available:</span>
                      <span>{listing.token.amount} tokens</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Price per token:</span>
                      <span>{listing.token.pricePerShare} {listing.paymentTokenSymbol}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Status:</span>
                      <span>{listing.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 p-2 rounded-lg mb-2">
                  <h3 className="text-sm font-medium mb-1 text-white">
                    Price & Volume Chart
                  </h3>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={generateBarChartData(listing.id)}>
                      <XAxis dataKey="time" stroke="#ccc" fontSize={10} />
                      <YAxis stroke="#ccc" domain={['auto', 'auto']} fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #4a5568', fontSize: 10 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="price" fill="#8884d8" name="Price" />
                      <Bar dataKey="volume" fill="#82ca9d" name="Volume" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white/5 p-2 rounded-lg mb-2">
                  <h3 className="text-sm font-medium mb-1 text-white">
                    Project Description
                  </h3>
                  <p className="text-gray-300 text-xs whitespace-pre-wrap line-clamp-1">
                    {listing.projectDescription || 'No description provided.'}
                  </p>
                </div>

                <div className="bg-white/5 p-2 rounded-lg mb-2">
                  <h3 className="text-sm font-medium mb-1 text-white">
                    Links
                  </h3>
                  <div className="space-y-1">
                    {listing.websiteUrl && (
                      <a
                        href={listing.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-primary-400 hover:text-primary-300 text-xs"
                      >
                        <Globe className="w-3 h-3 mr-1" />
                        <span>{listing.websiteUrl}</span>
                      </a>
                    )}
                    {listing.twitterUrl && (
                      <a
                        href={listing.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-primary-400 hover:text-primary-300 text-xs"
                      >
                        <Twitter className="w-3 h-3 mr-1" />
                        <span>{listing.twitterUrl}</span>
                      </a>
                    )}
                    {listing.telegramUrl && (
                      <a
                        href={listing.telegramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-primary-400 hover:text-primary-300 text-xs"
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />
                        <span>{listing.telegramUrl}</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 p-2 rounded-lg mb-2">
                  <h3 className="text-sm font-medium mb-1 text-white">
                    Contract Addresses
                  </h3>
                  <div className="space-y-1">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Token Contract:</p>
                      <div className="flex items-center">
                        <p className="text-xxs text-primary-300 break-all mr-1">{listing.token.address}</p>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => copyToClipboard(listing.token.address)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Copy className="w-3 h-3" />
                        </motion.button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Marketplace Contract:</p>
                      <div className="flex items-center">
                        <p className="text-xxs text-primary-300 break-all mr-1">{MARKETPLACE_ADDRESS}</p>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => copyToClipboard(MARKETPLACE_ADDRESS)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Copy className="w-3 h-3" />
                        </motion.button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Seller Address:</p>
                      <div className="flex items-center">
                        <p className="text-xxs text-primary-300 break-all mr-1">{listing.seller}</p>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => copyToClipboard(listing.seller)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Copy className="w-3 h-3" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>

                {signer && userAddress && (
                  <div className="flex space-x-2">
                    {listing.seller.toLowerCase() !== userAddress && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleBuy(listing)}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 transition-colors rounded-lg py-1 flex items-center justify-center text-white text-xs"
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Buy Tokens
                      </motion.button>
                    )}
                    {listing.seller.toLowerCase() === userAddress && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCancel(listing.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 transition-colors rounded-lg py-1 flex items-center justify-center text-white text-xs"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Cancel Listing
                      </motion.button>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400">
            <p>No tokens available.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}