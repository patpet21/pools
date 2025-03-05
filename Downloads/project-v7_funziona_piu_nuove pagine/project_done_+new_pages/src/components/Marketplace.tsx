import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  ExternalLink,
  Globe,
  Twitter,
  MessageCircle,
  Trash2,
  ShoppingCart,
  DollarSign,
  Link,
  Copy,
  Check,
  Info,
  Gift,
  Share2,
  ArrowRight,
  FileText,
  Lock,
} from 'lucide-react';
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

async function getListings(signer: ethers.Signer) {
  try {
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
    const listingCount = await marketplace.listingCount();
    console.log(`Total listings count: ${listingCount.toString()}`);
    const listings = [];
    const userAddress = await signer.getAddress();

    for (let i = 0; i < Number(listingCount); i++) {
      try {
        const [mainDetails, metadata] = await Promise.all([
          marketplace.getListingMainDetails(i),
          marketplace.getListingMetadata(i)
        ]);

        const token = new ethers.Contract(mainDetails.tokenAddress, TOKEN_ABI, signer);
        const [name, symbol] = await Promise.all([token.name(), token.symbol()]);

        const paymentToken = new ethers.Contract(mainDetails.paymentToken, TOKEN_ABI, signer);
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
          isOwner: mainDetails.seller.toLowerCase() === userAddress.toLowerCase(),
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

    console.log('Returned listings:', listings);
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

interface MarketplaceProps {
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
  isOwner: boolean;
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

export default function Marketplace({ onClose, signer }: MarketplaceProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'price' | 'name'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [copiedLinkId, setCopiedLinkId] = useState<number | null>(null);
  const [showReferralInfo, setShowReferralInfo] = useState<number | null>(null);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [selectedReferralListing, setSelectedReferralListing] = useState<Listing | null>(null);
  const [referralLink, setReferralLink] = useState('');
  const [isReferralPurchase, setIsReferralPurchase] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetailsListing, setSelectedDetailsListing] = useState<Listing | null>(null);
  const [autoShowBuyModal, setAutoShowBuyModal] = useState(false);

  useEffect(() => {
    if (signer) {
      loadListings();
      const interval = setInterval(loadListings, 60000);
      return () => clearInterval(interval);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const listingId = urlParams.get('listingId');
    const referral = urlParams.get('referral');

    if (listingId && referral && signer) {
      setReferralCode(referral);
      setIsReferralPurchase(true);
      setAutoShowBuyModal(true);
    }
  }, [signer]);

  const loadListings = async () => {
    try {
      if (!signer) return;
      const allListings = await getListings(signer);
      const currentTime = Math.floor(Date.now() / 1000);
      const activeListings = allListings.filter(
        (listing) => listing.active && listing.endTime > currentTime && parseFloat(listing.token.amount) > 0
      );
      setListings(activeListings);

      const urlParams = new URLSearchParams(window.location.search);
      const listingId = urlParams.get('listingId');
      const referral = urlParams.get('referral');

      if (listingId && referral) {
        setReferralCode(referral);
        const listing = activeListings.find((l) => l.id === Number(listingId));
        if (listing && autoShowBuyModal) {
          setSelectedListing(listing);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (listing: Listing) => {
    if (!signer) {
      toast.error('Please connect your wallet to buy tokens.');
      return;
    }
    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      console.log(`Attempting to buy ${buyAmount} tokens from listing ${listing.id}`);
      const receipt = await buyTokens(listing.id, buyAmount, signer, referralCode || undefined);
      console.log('Buy receipt:', receipt);
      toast.success('Purchase successful!');
      loadListings();
      setSelectedListing(null);
      setBuyAmount('');
      setReferralCode('');
      setIsReferralPurchase(false);
    } catch (error: any) {
      console.error('Buy error:', error);
      toast.error(error.message || 'Failed to complete purchase');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (listingId: number) => {
    if (!signer) {
      toast.error('Please connect your wallet to cancel listing.');
      return;
    }
    try {
      setLoading(true);
      console.log(`Canceling listing ${listingId}`);
      const receipt = await cancelListing(listingId, signer);
      console.log('Cancel receipt:', receipt);
      toast.success('Listing cancelled successfully!');
      loadListings();
    } catch (error: any) {
      console.error('Cancel error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async (listing: Listing) => {
    if (!signer) {
      toast.error('Please connect your wallet to copy referral link.');
      return;
    }
    try {
      const baseUrl = window.location.origin;
      const link = `${baseUrl}?listingId=${listing.id}&referral=${listing.referralCode}`;
      await navigator.clipboard.writeText(link);
      setCopiedLinkId(listing.id);
      toast.success('Referral link copied to clipboard!');
      setTimeout(() => setCopiedLinkId(null), 3000);
    } catch (error) {
      toast.error('Failed to copy referral link');
    }
  };

  const openReferralModal = async (listing: Listing) => {
    if (!signer) {
      toast.error('Please connect your wallet to share referral link.');
      return;
    }
    try {
      const baseUrl = window.location.origin;
      const link = `${baseUrl}?listingId=${listing.id}&referral=${listing.referralCode}`;
      setReferralLink(link);
      setSelectedReferralListing(listing);
      setShowReferralModal(true);
    } catch (error) {
      toast.error('Failed to generate referral link');
    }
  };

  const toggleReferralInfo = (listingId: number) => {
    if (!signer) {
      toast.error('Please connect your wallet to view referral info.');
      return;
    }
    setShowReferralInfo(showReferralInfo === listingId ? null : listingId);
  };

  const openDetailsModal = (listing: Listing) => {
    if (!signer) {
      toast.error('Please connect your wallet to view details.');
      return;
    }
    setSelectedDetailsListing(listing);
    setShowDetailsModal(true);
  };

  const copyToClipboard = async (text: string, message: string = 'Copied to clipboard!') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Funzione per calcolare il tempo rimanente
  const getTimeRemaining = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = endTime - now;
    if (timeLeft <= 0) return "Expired";
    
    const days = Math.floor(timeLeft / (24 * 3600));
    const hours = Math.floor((timeLeft % (24 * 3600)) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  const currentTime = Math.floor(Date.now() / 1000);
  const filteredListings = listings.filter(
    (listing) => listing.active && listing.endTime > currentTime && parseFloat(listing.token.amount) > 0
  );

  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sortBy === 'price') {
      const priceA = parseFloat(a.token.pricePerShare);
      const priceB = parseFloat(b.token.pricePerShare);
      return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
    } else {
      return sortOrder === 'asc'
        ? a.token.name.localeCompare(b.token.name)
        : b.token.name.localeCompare(a.token.name);
    }
  });

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
        className="bg-white/10 backdrop-blur rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Property Token Marketplace</h2>
          <div className="flex items-center space-x-4">
            <select
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'price' | 'name')}
            >
              <option value="price">Sort by Price</option>
              <option value="name">Sort by Name</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
            >
              {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {isReferralPurchase && signer && (
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg p-4 mb-6 shadow-lg">
            <div className="flex items-center">
              <Gift className="w-8 h-8 text-white mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-white">You're using a referral link!</h3>
                <p className="text-purple-100">
                  You're about to purchase tokens through a referral. The referrer will receive a reward when you complete your purchase.
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading listings...</p>
          </div>
        ) : sortedListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white/5 rounded-lg overflow-hidden group hover:bg-white/10 transition-all border border-white/10 hover:border-primary-500"
              >
                {listing.imageUrl && (
                  <div className="relative overflow-hidden">
                    <img
                      src={listing.imageUrl}
                      alt={listing.token.name}
                      className="w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-300"
                    />
                    {listing.referralActive && signer && (
                      <div className="absolute top-3 left-3 flex items-center">
                        <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-md font-medium shadow-lg">
                          {listing.referralPercent}% Referral
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleReferralInfo(listing.id);
                          }}
                          className="bg-purple-700 text-white rounded-full p-1 ml-1 shadow-lg hover:bg-purple-500 transition-colors"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {listing.isOwner && signer && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded-md font-medium shadow-lg">
                          Your Listing
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{listing.token.name}</h3>
                    <p className="text-sm text-gray-400">{listing.token.symbol}</p>
                  </div>

                  {showReferralInfo === listing.id && listing.referralActive && signer && (
                    <div className="bg-purple-500/20 p-3 rounded-lg mb-3 border border-purple-500/30">
                      <p className="text-sm text-purple-300 mb-1">
                        <span className="font-semibold">Referral Program:</span> {listing.referralPercent}% of tokens
                      </p>
                      <p className="text-xs text-gray-300">
                        Share your referral link to earn {listing.referralPercent}% of tokens when someone buys through your link.
                      </p>
                      <button
                        onClick={() => openReferralModal(listing)}
                        className="mt-2 w-full bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg py-1.5 flex items-center justify-center text-xs"
                      >
                        <Share2 className="w-3 h-3 mr-1" />
                        <span>Share Referral Link</span>
                      </button>
                    </div>
                  )}

                  {listing.projectDescription && (
                    <div className="bg-white/5 p-3 rounded-lg">
                      <p className="text-sm text-gray-300 line-clamp-3">{listing.projectDescription}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Available:</span>
                      <span>{listing.token.amount} tokens</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price per token:</span>
                      <span>{listing.token.pricePerShare} {listing.paymentTokenSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time Remaining:</span>
                      <span className="text-gray-300">{getTimeRemaining(listing.endTime)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {listing.websiteUrl && (
                      <a
                        href={listing.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm text-primary-400 hover:text-primary-300"
                      >
                        <Globe className="w-4 h-4 mr-1" />
                        Website
                      </a>
                    )}
                    {listing.twitterUrl && (
                      <a
                        href={listing.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm text-primary-400 hover:text-primary-300"
                      >
                        <Twitter className="w-4 h-4 mr-1" />
                        Twitter
                      </a>
                    )}
                    {listing.telegramUrl && (
                      <a
                        href={listing.telegramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm text-primary-400 hover:text-primary-300"
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Telegram
                      </a>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openDetailsModal(listing)}
                      className="flex items-center justify-center bg-primary-600/30 hover:bg-primary-600/50 transition-colors px-3 py-1 rounded-md text-sm text-white font-medium"
                      disabled={!signer}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Details
                    </motion.button>
                  </div>

                  {signer ? (
                    listing.isOwner ? (
                      <div className="space-y-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleCancel(listing.id)}
                          className="w-full bg-red-600 hover:bg-red-700 transition-colors rounded-lg py-2 flex items-center justify-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Cancel Listing</span>
                        </motion.button>
                        {listing.referralActive && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openReferralModal(listing)}
                            className="w-full bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg py-2 flex items-center justify-center space-x-2"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share Referral Link</span>
                          </motion.button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedListing(listing)}
                          className="w-full bg-primary-600 hover:bg-primary-700 transition-colors rounded-lg py-2 flex items-center justify-center space-x-2"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>Buy Tokens</span>
                        </motion.button>
                        {listing.referralActive && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openReferralModal(listing)}
                            className="w-full bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg py-2 flex items-center justify-center space-x-2"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share Referral Link</span>
                          </motion.button>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
                      <Lock className="w-12 h-12 text-primary-400 mb-3" />
                      <p className="text-lg font-medium text-white mb-4">Connect wallet to unlock</p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (typeof onClose === 'function') onClose();
                        }}
                        className="bg-primary-600 hover:bg-primary-700 transition-colors px-6 py-2 rounded-lg flex items-center"
                      >
                        <Lock className="w-5 h-5 mr-2" />
                        <span>Connect Wallet</span>
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No active listings available.</p>
          </div>
        )}

        {selectedListing && signer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-gradient-to-b from-gray-900 to-black rounded-xl p-6 max-w-md w-full border border-white/10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Buy {selectedListing.token.name} Tokens</h3>
                <button
                  onClick={() => {
                    setSelectedListing(null);
                    setBuyAmount('');
                    if (!isReferralPurchase) setReferralCode('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {isReferralPurchase && (
                <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-3 mb-4">
                  <div className="flex items-start">
                    <Gift className="w-5 h-5 text-purple-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-purple-300">Referral Purchase</p>
                      <p className="text-xs text-gray-300">
                        You're buying through a referral link. The referrer will receive {selectedListing.referralPercent}% of your purchase as a reward.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount to Buy</label>
                  <input
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    min="0.00001"
                    step="0.00001"
                    max={selectedListing.token.amount}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="bg-white/5 p-3 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Price per token:</span>
                    <span className="font-medium">{selectedListing.token.pricePerShare} {selectedListing.paymentTokenSymbol}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-400">Total Cost:</span>
                    <span className="font-medium text-primary-300">
                      {buyAmount
                        ? `${(parseFloat(buyAmount) * parseFloat(selectedListing.token.pricePerShare)).toFixed(6)} ${selectedListing.paymentTokenSymbol}`
                        : '-'}
                    </span>
                  </div>
                </div>

                {selectedListing.referralActive && !isReferralPurchase && (
                  <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/30">
                    <p className="text-sm text-purple-300 mb-2 flex items-center">
                      <Gift className="w-4 h-4 mr-1" />
                      <span>This listing has a {selectedListing.referralPercent}% referral reward!</span>
                    </p>
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Referral Code (optional)</label>
                      <input
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white text-sm"
                        placeholder="Enter referral code"
                      />
                    </div>
                  </div>
                )}

                <div className="flex space-x-4 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 bg-white/5 hover:bg-white/10 transition-colors rounded-lg py-2"
                    onClick={() => {
                      setSelectedListing(null);
                      setBuyAmount('');
                      if (!isReferralPurchase) setReferralCode('');
                    }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 transition-colors rounded-lg py-2 flex items-center justify-center"
                    onClick={() => handleBuy(selectedListing)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Confirm Purchase
                  </motion.button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedListing(null);
                    openDetailsModal(selectedListing);
                  }}
                  className="w-full bg-white/5 hover:bg-white/10 transition-colors rounded-lg py-2 flex items-center justify-center mt-2"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Project Details
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showReferralModal && selectedReferralListing && signer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-gradient-to-b from-purple-900 to-gray-900 rounded-xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">Share Referral Link</h3>
                <button
                  onClick={() => {
                    setShowReferralModal(false);
                    setSelectedReferralListing(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-start">
                    <Gift className="w-6 h-6 text-purple-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-base font-medium text-purple-300">Earn {selectedReferralListing.referralPercent}% Referral Rewards</p>
                      <p className="text-sm text-gray-300 mt-1">
                        Share this link with others. When they purchase tokens through your link, you'll receive {selectedReferralListing.referralPercent}% of the tokens!
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Your Unique Referral Link</label>
                  <div className="flex">
                    <input
                      type="text"
                      value={referralLink}
                      readOnly
                      className="flex-1 bg-white/5 border border-white/10 rounded-l-lg px-4 py-2 text-white text-sm"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => copyReferralLink(selectedReferralListing)}
                      className="bg-purple-600 hover:bg-purple-700 transition-colors rounded-r-lg px-4 py-2 flex items-center"
                    >
                      <Copy className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <a
                    href={`https://twitter.com/intent/tweet?text=Check%20out%20this%20property%20token%20on%20Properties%20DEX!&url=${encodeURIComponent(referralLink)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 transition-colors rounded-lg py-2 px-4 flex items-center justify-center"
                  >
                    <Twitter className="w-4 h-4 mr-2" />
                    Share on Twitter
                  </a>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Check%20out%20this%20property%20token%20on%20Properties%20DEX!`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-500 hover:bg-blue-600 transition-colors rounded-lg py-2 px-4 flex items-center justify-center"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Share on Telegram
                  </a>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-2">How Referrals Work</h4>
                  <ol className="text-xs text-gray-300 space-y-2 list-decimal pl-4">
                    <li>Share your unique referral link with potential buyers</li>
                    <li>When they click your link and purchase tokens, you're credited</li>
                    <li>You'll receive {selectedReferralListing.referralPercent}% of the tokens they purchase</li>
                    <li>Rewards are sent to your wallet after the purchase</li>
                  </ol>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowReferralModal(false);
                    openDetailsModal(selectedReferralListing);
                  }}
                  className="w-full bg-white/5 hover:bg-white/10 transition-colors rounded-lg py-2 flex items-center justify-center"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Project Details
                </motion.button>

                <div className="flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowReferralModal(false);
                      setSelectedReferralListing(null);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg py-2 px-6 flex items-center"
                  >
                    Done
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showDetailsModal && selectedDetailsListing && signer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-gradient-to-b from-gray-900 to-black rounded-xl p-6 max-w-2xl w-full border border-white/10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{selectedDetailsListing.token.name} Details</h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedDetailsListing(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {selectedDetailsListing.imageUrl && (
                    <img
                      src={selectedDetailsListing.imageUrl}
                      alt={selectedDetailsListing.token.name}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}

                  <div className="bg-white/5 p-4 rounded-lg mb-4">
                    <h4 className="text-lg font-medium mb-2">Token Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Name:</span>
                        <span>{selectedDetailsListing.token.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Symbol:</span>
                        <span>{selectedDetailsListing.token.symbol || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Available:</span>
                        <span>{selectedDetailsListing.token.amount || '0'} tokens</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Price per token:</span>
                        <span>
                          {selectedDetailsListing.token.pricePerShare || '0'} {selectedDetailsListing.paymentTokenSymbol || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 p-4 rounded-lg">
                    <h4 className="text-lg font-medium mb-2">Contract Addresses</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Token Contract:</p>
                        <div className="flex items-center">
                          <p className="text-xs text-primary-300 break-all mr-2">
                            {selectedDetailsListing.token.address || 'N/A'}
                          </p>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => copyToClipboard(selectedDetailsListing.token.address || '')}
                            className="text-gray-400 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Marketplace Contract:</p>
                        <div className="flex items-center">
                          <p className="text-xs text-primary-300 break-all mr-2">{MARKETPLACE_ADDRESS || 'N/A'}</p>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => copyToClipboard(MARKETPLACE_ADDRESS || '')}
                            className="text-gray-400 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Seller Address:</p>
                        <div className="flex items-center">
                          <p className="text-xs text-primary-300 break-all mr-2">{selectedDetailsListing.seller || 'N/A'}</p>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => copyToClipboard(selectedDetailsListing.seller || '')}
                            className="text-gray-400 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-lg">
                    <h4 className="text-lg font-medium mb-2">Project Description</h4>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">
                      {selectedDetailsListing.projectDescription || 'No description provided.'}
                    </p>
                  </div>

                  <div className="bg-white/5 p-4 rounded-lg">
                    <h4 className="text-lg font-medium mb-2">Links</h4>
                    <div className="space-y-2">
                      {selectedDetailsListing.websiteUrl && (
                        <a
                          href={selectedDetailsListing.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-primary-400 hover:text-primary-300"
                        >
                          <Globe className="w-5 h-5 mr-2" />
                          <span>{selectedDetailsListing.websiteUrl}</span>
                        </a>
                      )}
                      {selectedDetailsListing.twitterUrl && (
                        <a
                          href={selectedDetailsListing.twitterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-primary-400 hover:text-primary-300"
                        >
                          <Twitter className="w-5 h-5 mr-2" />
                          <span>{selectedDetailsListing.twitterUrl}</span>
                        </a>
                      )}
                      {selectedDetailsListing.telegramUrl && (
                        <a
                          href={selectedDetailsListing.telegramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-primary-400 hover:text-primary-300"
                        >
                          <MessageCircle className="w-5 h-5 mr-2" />
                          <span>{selectedDetailsListing.telegramUrl}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {selectedDetailsListing.referralActive && (
                    <div className="bg-purple-500/20 p-4 rounded-lg border border-purple-500/30">
                      <h4 className="text-lg font-medium mb-2 text-purple-300">Referral Program</h4>
                      <p className="text-gray-300 text-sm mb-2">
                        This listing offers a {selectedDetailsListing.referralPercent}% referral reward.
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setShowDetailsModal(false);
                          openReferralModal(selectedDetailsListing);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg py-2 px-4 w-full flex items-center justify-center"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Referral Link
                      </motion.button>
                    </div>
                  )}

                  <div className="flex space-x-4 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 bg-white/5 hover:bg-white/10 transition-colors rounded-lg py-2"
                      onClick={() => {
                        setShowDetailsModal(false);
                        setSelectedDetailsListing(null);
                      }}
                    >
                      Close
                    </motion.button>
                    {!selectedDetailsListing.isOwner && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 transition-colors rounded-lg py-2 flex items-center justify-center"
                        onClick={() => {
                          setShowDetailsModal(false);
                          setSelectedListing(selectedDetailsListing);
                        }}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Buy Tokens
                      </motion.button>
                    )}
                    {selectedDetailsListing.isOwner && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setShowDetailsModal(false);
                          handleCancel(selectedDetailsListing.id);
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 transition-colors rounded-lg py-2 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Cancel Listing
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}