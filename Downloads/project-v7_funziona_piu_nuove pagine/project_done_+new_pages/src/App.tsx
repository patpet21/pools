import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Toaster, toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Wallet, 
  Plus, 
  ShoppingBag, 
  ExternalLink, 
  Globe, 
  Twitter as TwitterIcon, 
  MessageCircle, 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  Lock, 
  LogOut, 
  Trash2, 
  Check, 
  Clock 
} from 'lucide-react';
import { connectWallet, getWalletBalances } from './lib/web3';
import CreateToken from './components/CreateToken';
import ListToken from './components/ListToken';
import Marketplace from './components/Marketplace';
import BuyPRDX from './components/BuyPRDX';
import DelistingPage from './components/DelistingPage';
import TokenSoldPage from './components/TokenSoldPage';
import TokenDetailsPage from './components/TokenDetailsPage';
import AllTokensPage from './components/AllTokensPage';

// Component for the homepage with navigation
const HomePage: React.FC<{ 
  signer: ethers.Signer | null; 
  setShowCreateToken: (value: boolean) => void; 
  setShowListToken: (value: boolean) => void; 
  setShowMarketplace: (value: boolean) => void; 
  setShowDelisting: (value: boolean) => void; 
  setShowTokenSold: (value: boolean) => void; 
  handleConnectWallet: () => void; 
  isConnecting: boolean; 
  setShowTokenDetails: (value: boolean) => void; 
  setShowAllTokens: (value: boolean) => void;
}> = ({ 
  signer, 
  setShowCreateToken, 
  setShowListToken, 
  setShowMarketplace, 
  setShowDelisting, 
  setShowTokenSold, 
  handleConnectWallet, 
  isConnecting, 
  setShowTokenDetails, 
  setShowAllTokens 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="space-y-12"
    >
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4">Properties DEX (PRDX)</h2>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-6">
          The first decentralized exchange for tokenized real estate on the Base network
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 mb-12">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-3">Token Details</h3>
            <p className="text-sm text-gray-400 mb-2">PRDX Token Address:</p>
            <p className="text-sm text-primary-300 break-all">
              0xAFEe9745Cfa34a9b552e9C6c7848e601b42Fca14
            </p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-3">Platform Fee</h3>
            <p className="text-2xl font-bold text-primary-300 mb-1">0.1%</p>
            <p className="text-sm text-gray-400">on transactions</p>
            <p className="text-xs text-gray-500 mt-2">Applied to purchases and listings</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-3">Network</h3>
            <p className="text-2xl font-bold text-primary-300 mb-1">Base Network</p>
            <p className="text-sm text-gray-400">Fast & low-cost transactions</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowBuyPRDX(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all px-8 py-3 rounded-lg text-lg font-semibold shadow-lg flex items-center mx-auto mb-12"
        >
          <DollarSign className="w-5 h-5 mr-2" />
          Buy PRDX on Uniswap
          <ExternalLink className="w-4 h-4 ml-2" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Card per Token Details */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 cursor-pointer hover:shadow-lg transition-shadow" 
             onClick={() => setShowTokenDetails(true)}>
          <div className="flex items-center justify-between mb-4">
            <Building2 className="w-10 h-10 text-primary-400" />
            <div className="bg-primary-500/20 text-primary-300 text-xs px-3 py-1 rounded-full">
              Details
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">Token Details</h3>
          <p className="text-gray-300 mb-4">
            View detailed information about property tokens, including price, availability, and charts.
          </p>
          <div className="bg-white/5 p-3 rounded-lg">
            <div className="flex items-start">
              <BarChart3 className="w-5 h-5 text-primary-300 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-400">
                Explore price trends and metadata for each token.
              </p>
            </div>
          </div>
        </div>

        {/* Card per All Tokens */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 cursor-pointer hover:shadow-lg transition-shadow" 
             onClick={() => setShowAllTokens(true)}>
          <div className="flex items-center justify-between mb-4">
            <ShoppingBag className="w-10 h-10 text-primary-400" />
            <div className="bg-primary-500/20 text-primary-300 text-xs px-3 py-1 rounded-full">
              All Tokens
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">All Property Tokens</h3>
          <p className="text-gray-300 mb-4">
            Browse and manage all available property tokens on the marketplace.
          </p>
          <div className="bg-white/5 p-3 rounded-lg">
            <div className="flex items-start">
              <TrendingUp className="w-5 h-5 text-primary-300 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-400">
                Discover new investment opportunities and track listings.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 relative group">
          <div className="flex items-center justify-between mb-4">
            <Plus className="w-10 h-10 text-primary-400 group-hover:text-primary-300 transition-colors" />
            <div className="bg-primary-500/20 text-primary-300 text-xs px-3 py-1 rounded-full">
              Create
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">Create Property Token</h3>
          <p className="text-gray-300 mb-4">
            Tokenize your real estate property by creating a new token. Define your token's name, symbol, and supply.
          </p>
          <div className="bg-white/5 p-3 rounded-lg">
            <div className="flex items-start">
              <TrendingUp className="w-5 h-5 text-primary-300 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-400">
                Create ERC-20 tokens representing fractional ownership of your property with just a few clicks.
              </p>
            </div>
          </div>
          
          {!signer && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
              <Lock className="w-12 h-12 text-primary-400 mb-3" />
              <p className="text-lg font-medium text-white mb-4">Connect wallet to unlock</p>
              <button
                onClick={() => handleConnectWallet()}
                disabled={isConnecting}
                className="bg-primary-600 hover:bg-primary-700 transition-colors px-6 py-2 rounded-lg flex items-center"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5 mr-2" />
                    Connect Wallet
                  </>
                )}
              </button>
            </div>
          )}
          
          {signer && (
            <button
              onClick={() => setShowCreateToken(true)}
              className="absolute inset-0 w/full h/full cursor-pointer z-10 opacity-0"
              aria-label="Create Token"
            />
          )}
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 relative group">
          <div className="flex items-center justify-between mb-4">
            <ShoppingBag className="w-10 h-10 text-primary-400 group-hover:text-primary-300 transition-colors" />
            <div className="bg-primary-500/20 text-primary-300 text-xs px-3 py-1 rounded-full">
              List
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">List Property Token</h3>
          <p className="text-gray-300 mb-4">
            List your property tokens on the marketplace. Set your price and start selling shares of your property.
          </p>
          <div className="bg-white/5 p-3 rounded-lg">
            <div className="flex items-start">
              <BarChart3 className="w-5 h-5 text-primary-300 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-400">
                Enable referral rewards to incentivize others to promote your property tokens.
              </p>
            </div>
          </div>
          
          {!signer && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
              <Lock className="w-12 h-12 text-primary-400 mb-3" />
              <p className="text-lg font-medium text-white mb-4">Connect wallet to unlock</p>
              <button
                onClick={() => handleConnectWallet()}
                disabled={isConnecting}
                className="bg-primary-600 hover:bg-primary-700 transition-colors px-6 py-2 rounded-lg flex items-center"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5 mr-2" />
                    Connect Wallet
                  </>
                )}
              </button>
            </div>
          )}
          
          {signer && (
            <button
              onClick={() => setShowListToken(true)}
              className="absolute inset-0 w/full h/full cursor-pointer z-10 opacity-0"
              aria-label="List Token"
            />
          )}
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 relative group md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <Building2 className="w-10 h-10 text-primary-400 group-hover:text-primary-300 transition-colors" />
            <div className="bg-primary-500/20 text-primary-300 text-xs px-3 py-1 rounded-full">
              Marketplace
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">Property Token Marketplace</h3>
          <p className="text-gray-300 mb-4">
            Browse and buy property tokens from the marketplace. Invest in real estate with fractional ownership.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="flex items-start">
                <DollarSign className="w-5 h-5 text-primary-300 mt-1 mr-2 flex-shrink-0" />
                <p className="text-sm text-gray-400">
                  Pay with PRDX or USDC tokens for maximum flexibility.
                </p>
              </div>
            </div>
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="flex items-start">
                <TrendingUp className="w-5 h-5 text-primary-300 mt-1 mr-2 flex-shrink-0" />
                <p className="text-sm text-gray-400">
                  Earn referral rewards by sharing property token listings with others.
                </p>
              </div>
            </div>
          </div>
          
          {!signer && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
              <Lock className="w-12 h-12 text-primary-400 mb-3" />
              <p className="text-lg font-medium text-white mb-4">Connect wallet to unlock</p>
              <button
                onClick={() => handleConnectWallet()}
                disabled={isConnecting}
                className="bg-primary-600 hover:bg-primary-700 transition-colors px-6 py-2 rounded-lg flex items-center"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5 mr-2" />
                    Connect Wallet
                  </>
                )}
              </button>
            </div>
          )}
          
          {signer && (
            <button
              onClick={() => setShowMarketplace(true)}
              className="absolute inset-0 w/full h/full cursor-pointer z-10 opacity-0"
              aria-label="Open Marketplace"
            />
          )}
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 relative group">
          <div className="flex items-center justify-between mb-4">
            <Trash2 className="w-10 h-10 text-primary-400 group-hover:text-primary-300 transition-colors" />
            <div className="bg-primary-500/20 text-primary-300 text-xs px-3 py-1 rounded-full">
              Delisting
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">Delisting</h3>
          <p className="text-gray-300 mb-4">
            View and manage expired property token listings that have not been fully sold.
          </p>
          <div className="bg-white/5 p-3 rounded-lg">
            <div className="flex items-start">
              <Clock className="w-5 h-5 text-primary-300 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-400">
                Listings expire after the set duration and can be withdrawn by the owner.
              </p>
            </div>
          </div>
          
          {!signer && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
              <Lock className="w-12 h-12 text-primary-400 mb-3" />
              <p className="text-lg font-medium text-white mb-4">Connect wallet to unlock</p>
              <button
                onClick={() => handleConnectWallet()}
                disabled={isConnecting}
                className="bg-primary-600 hover:bg-primary-700 transition-colors px-6 py-2 rounded-lg flex items-center"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5 mr-2" />
                    Connect Wallet
                  </>
                )}
              </button>
            </div>
          )}
          
          {signer && (
            <button
              onClick={() => setShowDelisting(true)}
              className="absolute inset-0 w/full h/full cursor-pointer z-10 opacity-0"
              aria-label="Open Delisting"
            />
          )}
        </div>
        
        <div className="bg/white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 relative group">
          <div className="flex items-center justify-between mb-4">
            <Check className="w-10 h-10 text-primary-400 group-hover:text-primary-300 transition-colors" />
            <div className="bg-primary-500/20 text-primary-300 text-xs px-3 py-1 rounded-full">
              Sold
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">Token Sold</h3>
          <p className="text-gray-300 mb-4">
            View property tokens that have been fully sold, showcasing successful listings.
          </p>
          <div className="bg-white/5 p-3 rounded-lg">
            <div className="flex items-start">
              <TrendingUp className="w-5 h-5 text-primary-300 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-400">
                Celebrate successful sales and track performance of your property tokens.
              </p>
            </div>
          </div>
          
          {!signer && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
              <Lock className="w-12 h-12 text-primary-400 mb-3" />
              <p className="text-lg font-medium text-white mb-4">Connect wallet to unlock</p>
              <button
                onClick={() => handleConnectWallet()}
                disabled={isConnecting}
                className="bg-primary-600 hover:bg-primary-700 transition-colors px-6 py-2 rounded-lg flex items-center"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5 mr-2" />
                    Connect Wallet
                  </>
                )}
              </button>
            </div>
          )}
          
          {signer && (
            <button
              onClick={() => setShowTokenSold(true)}
              className="absolute inset-0 w/full h/full cursor-pointer z-10 opacity-0"
              aria-label="Open Token Sold"
            />
          )}
        </div>
      </div>
      
      {!signer && (
        <div className="bg-gradient-to-r from-primary-900/50 to-secondary-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center mb-12">
          <Wallet className="w-16 h-16 text-primary-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Connect Your Wallet</h3>
          <p className="text-gray-300 mb-6 max-w-lg mx-auto">
            Connect your wallet to start creating and trading property tokens. You'll need a wallet that supports the Base network.
          </p>
          <button
            onClick={() => handleConnectWallet()}
            disabled={isConnecting}
            className="bg-primary-600 hover:bg-primary-700 transition-colors px-6 py-3 rounded-lg flex items-center mx-auto"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5 mr-2" />
                Connect Wallet
              </>
            )}
          </button>
        </div>
      )}
      
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-8">
        <p className="text-sm text-yellow-200 text-center">
          <strong>Disclaimer:</strong> Properties DEX is a decentralized platform for tokenizing and trading real estate assets. 
          Users are responsible for conducting their own due diligence before investing. 
          Cryptocurrency and tokenized real estate investments involve significant risks including potential loss of principal. 
          Past performance is not indicative of future results.
        </p>
      </div>
    </motion.div>
  );
};

function App() {
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [balances, setBalances] = useState<{ eth: string; prdx: string; usdc: string } | null>(null);
  const [showCreateToken, setShowCreateToken] = useState(false);
  const [showListToken, setShowListToken] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showBuyPRDX, setShowBuyPRDX] = useState(false);
  const [showDelisting, setShowDelisting] = useState(false);
  const [showTokenSold, setShowTokenSold] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [newTokenAddress, setNewTokenAddress] = useState<string | null>(null); // Stato per il nuovo token
  const [showTokenDetails, setShowTokenDetails] = useState(false); // Stato per TokenDetailsPage
  const [showAllTokens, setShowAllTokens] = useState(false); // Stato per AllTokensPage

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('listingId') && urlParams.has('referral')) {
      handleConnectWallet(true);
    }
    if (signer) {
      const interval = setInterval(() => updateBalances(), 30000);
      return () => clearInterval(interval);
    }
  }, [signer]);

  const handleConnectWallet = async (autoOpenMarketplace = false) => {
    try {
      setIsConnecting(true);
      const signer = await connectWallet();
      setSigner(signer);
      const address = await signer.getAddress();
      setWalletAddress(address);
      
      const balances = await getWalletBalances(signer);
      setBalances(balances);
      
      if (autoOpenMarketplace) {
        setShowMarketplace(true);
      }
      toast.success('Wallet connected successfully!');
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectWallet = () => {
    setSigner(null);
    setWalletAddress('');
    setBalances(null);
    setShowCreateToken(false);
    setShowListToken(false);
    setShowMarketplace(false);
    setShowDelisting(false);
    setShowTokenSold(false);
    setNewTokenAddress(null); // Reset del token address
    setShowTokenDetails(false); // Reset dei nuovi stati
    setShowAllTokens(false);
    toast('Wallet disconnected');
  };

  const updateBalances = async () => {
    if (signer) {
      try {
        const newBalances = await getWalletBalances(signer);
        setBalances(newBalances);
      } catch (error: any) {
        console.error('Error updating balances:', error);
      }
    }
  };

  const handleCreateTokenSuccess = (tokenAddress: string) => {
    setShowCreateToken(false);
    setNewTokenAddress(tokenAddress); // Salva l'indirizzo del nuovo token
    setShowListToken(true); // Apri ListToken invece di Marketplace
    updateBalances();
  };

  const handleListTokenSuccess = () => {
    setShowListToken(false);
    setShowMarketplace(true);
    setNewTokenAddress(null); // Reset dopo listing
    updateBalances();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900 text-white">
      <Toaster position="top-right" />
      
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/20 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="w-8 h-8 text-primary-400" />
            <h1 className="text-2xl font-bold">Properties DEX</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowBuyPRDX(true)}
              className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 transition-colors px-4 py-2 rounded-lg flex items-center"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Buy $PRDX
            </button>
            
            {!signer ? (
              <button
                onClick={() => handleConnectWallet()}
                disabled={isConnecting}
                className="bg-primary-600 hover:bg-primary-700 transition-colors px-4 py-2 rounded-lg flex items-center"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5 mr-2" />
                    Connect Wallet
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-primary-900 to-secondary-900 rounded-lg px-4 py-3 border border-primary-500/30 shadow-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-primary-300">Wallet: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}</span>
                    <button 
                      onClick={handleDisconnectWallet}
                      className="text-gray-400 hover:text-white ml-3 bg-white/10 rounded-full p-1"
                      title="Disconnect wallet"
                    >
                      <LogOut className="w-3 h-3" />
                    </button>
                  </div>
                  {balances && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/5 rounded px-2 py-1 text-center">
                        <span className="text-xs text-gray-400 block">ETH</span>
                        <span className="text-sm font-bold text-white">{parseFloat(balances.eth).toFixed(4)}</span>
                      </div>
                      <div className="bg-white/5 rounded px-2 py-1 text-center">
                        <span className="text-xs text-gray-400 block">PRDX</span>
                        <span className="text-sm font-bold text-primary-300">{parseFloat(balances.prdx).toFixed(2)}</span>
                      </div>
                      <div className="bg-white/5 rounded px-2 py-1 text-center">
                        <span className="text-xs text-gray-400 block">USDC</span>
                        <span className="text-sm font-bold text-green-300">{parseFloat(balances.usdc).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <HomePage 
            signer={signer} 
            setShowCreateToken={setShowCreateToken} 
            setShowListToken={setShowListToken} 
            setShowMarketplace={setShowMarketplace} 
            setShowDelisting={setShowDelisting} 
            setShowTokenSold={setShowTokenSold} 
            handleConnectWallet={handleConnectWallet} 
            isConnecting={isConnecting} 
            setShowTokenDetails={setShowTokenDetails} 
            setShowAllTokens={setShowAllTokens} 
          />
          
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-8">
            <p className="text-sm text-yellow-200 text-center">
              <strong>Disclaimer:</strong> Properties DEX is a decentralized platform for tokenizing and trading real estate assets. 
              Users are responsible for conducting their own due diligence before investing. 
              Cryptocurrency and tokenized real estate investments involve significant risks including potential loss of principal. 
              Past performance is not indicative of future results.
            </p>
          </div>
        </div>
      </main>
      
      <footer className="border-t border-white/10 py-8 mt-12 bg-black/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Building2 className="w-6 h-6 text-primary-400 mr-2" />
              <span className="font-bold">Properties DEX</span>
            </div>
            
            <div className="flex space-x-4 mb-4 md:mb-0">
              <a 
                href="https://tokenization.metalandspaceapp.xyz/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Globe className="w-6 h-6" />
              </a>
              <a 
                href="https://x.com/PreopertiesDex" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </a>
              <a 
                href="https://t.me/PropertiesDex" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </a>
            </div>
            
            <div className="text-sm text-gray-400">
              © 2025 Properties DEX. All rights reserved.
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-white/5">
            <p className="text-xs text-gray-500 text-center">
              Disclaimer: Properties DEX is a decentralized platform for tokenizing and trading real estate assets. 
              Users are responsible for conducting their own due diligence before investing. 
              Cryptocurrency and tokenized real estate investments involve significant risks including potential loss of principal. 
              Past performance is not indicative of future results.
            </p>
          </div>
        </div>
      </footer>
      
      {showCreateToken && signer && (
        <CreateToken
          onClose={() => setShowCreateToken(false)}
          onSuccess={handleCreateTokenSuccess}
          signer={signer}
        />
      )}
      
      {showListToken && signer && (
        <ListToken
          onClose={() => setShowListToken(false)}
          onSuccess={handleListTokenSuccess}
          signer={signer}
          initialTokenAddress={newTokenAddress} // Passa il tokenAddress a ListToken
        />
      )}
      
      {showMarketplace && signer && (
        <Marketplace
          onClose={() => setShowMarketplace(false)}
          signer={signer}
        />
      )}
      
      {showBuyPRDX && (
        <BuyPRDX
          onClose={() => setShowBuyPRDX(false)}
        />
      )}
      
      {showDelisting && signer && (
        <DelistingPage
          onClose={() => setShowDelisting(false)}
          signer={signer}
        />
      )}
      
      {showTokenSold && signer && (
        <TokenSoldPage
          onClose={() => setShowTokenSold(false)}
          signer={signer}
        />
      )}
      
      {/* Modali per TokenDetailsPage e AllTokensPage (visibili a tutti, wallet richiesto solo per "Buy") */}
      {showTokenDetails && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <TokenDetailsPage
            onClose={() => setShowTokenDetails(false)}
            signer={signer}
          />
        </motion.div>
      )}
      
      {showAllTokens && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <AllTokensPage
            onClose={() => setShowAllTokens(false)}
            signer={signer}
          />
        </motion.div>
      )}
    </div>
  );
}

export default App;