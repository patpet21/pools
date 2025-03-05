import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Building2, Globe, Check, Lock, FileText } from 'lucide-react';
import { ethers } from 'ethers';
import { getListings } from '../lib/web3';
import toast from 'react-hot-toast';

interface TokenSoldPageProps {
  onClose: () => void;
  signer: ethers.Signer | null;
}

interface Listing {
  id: number;
  seller: string;
  token: { address: string; name: string; symbol: string; amount: string; pricePerShare: string };
  paymentTokenSymbol: string;
  imageUrl: string;
  endTime: number;
}

export default function TokenSoldPage({ onClose, signer }: TokenSoldPageProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetailsListing, setSelectedDetailsListing] = useState<Listing | null>(null);

  useEffect(() => {
    if (signer) {
      loadListings();
      // Aggiorna i listing ogni minuto
      const interval = setInterval(loadListings, 60000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [signer]);

  const loadListings = async () => {
    try {
      if (!signer) return;
      const allListings = await getListings(signer);
      console.log('All listings:', allListings); // Debug
      const sold = allListings.filter((listing) => parseFloat(listing.token.amount) === 0);
      console.log('Sold listings:', sold); // Debug
      setListings(sold);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="text-2xl font-bold">Properties DEX - Token Sold</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <main className="container mx-auto px-4 py-6">
          <div className="max-w-5xl mx-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                <p className="mt-4 text-gray-400">Loading sold tokens...</p>
              </div>
            ) : !signer ? (
              <div className="text-center py-12">
                <Lock className="w-16 h-16 text-primary-400 mx-auto mb-4" />
                <p className="text-xl font-medium text-white mb-4">Connect wallet to view sold tokens</p>
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12">
                <Check className="w-16 h-16 text-primary-400 mx-auto mb-4" />
                <p className="text-xl font-medium text-white mb-2">No sold tokens available</p>
                <p className="text-gray-400">When your tokens are fully sold, they will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="bg-white/5 rounded-lg overflow-hidden border border-white/10 hover:border-green-500/50 transition-all"
                  >
                    {listing.imageUrl && (
                      <div className="relative">
                        <img src={listing.imageUrl} alt={listing.token.name} className="w-full h-48 object-cover" />
                        <div className="absolute top-3 right-3 bg-green-600 text-white text-xs px-2 py-1 rounded-md font-medium shadow-lg">
                          Sold Out
                        </div>
                      </div>
                    )}
                    <div className="p-4 space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold">{listing.token.name}</h3>
                        <p className="text-sm text-gray-400">{listing.token.symbol}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Available:</span>
                          <span className="text-green-400">0 tokens (Sold Out)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Price per token:</span>
                          <span>{listing.token.pricePerShare} {listing.paymentTokenSymbol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">End Time:</span>
                          <span>{new Date(listing.endTime * 1000).toLocaleString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowDetailsModal(true);
                          setSelectedDetailsListing(listing);
                        }}
                        className="w-full bg-primary-600 hover:bg-primary-700 rounded-lg py-2 flex items-center justify-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <div className="mt-6 pt-4 border-t border-white/5">
          <p className="text-xs text-gray-500 text-center">
            Disclaimer: Properties DEX is a decentralized platform for tokenizing and trading real estate assets. 
            Users are responsible for conducting their own due diligence before investing. 
            Cryptocurrency and tokenized real estate investments involve significant risks including potential loss of principal. 
            Past performance is not indicative of future results.
          </p>
        </div>

        {showDetailsModal && selectedDetailsListing && signer && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-gradient-to-b from-gray-900 to-black rounded-xl p-6 max-w-2xl w-full border border-white/10 shadow-2xl">
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
                </div>

                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-lg">
                    <h4 className="text-lg font-medium mb-2">Sale Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">End Time:</span>
                        <span>{new Date(selectedDetailsListing.endTime * 1000).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Seller:</span>
                        <span>{selectedDetailsListing.seller.substring(0, 6)}...{selectedDetailsListing.seller.substring(selectedDetailsListing.seller.length - 4)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <button
                      className="flex-1 bg-white/5 hover:bg-white/10 transition-colors rounded-lg py-2"
                      onClick={() => {
                        setShowDetailsModal(false);
                        setSelectedDetailsListing(null);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}