import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2, Building2, Globe, Clock, Lock } from 'lucide-react';
import { ethers } from 'ethers';
import { getListings, cancelListing } from '../lib/web3';
import toast from 'react-hot-toast';

interface DelistingPageProps {
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
  imageUrl: string;
  endTime: number;
}

export default function DelistingPage({ onClose, signer }: DelistingPageProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

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
      const currentTime = Math.floor(Date.now() / 1000);
      const delisted = allListings.filter(
        (listing) => listing.active && listing.endTime <= currentTime && parseFloat(listing.token.amount) > 0
      );
      console.log('Delisted listings:', delisted); // Debug
      setListings(delisted);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (listingId: number) => {
    if (!signer) {
      toast.error('Please connect your wallet.');
      return;
    }
    try {
      setLoading(true);
      await cancelListing(listingId, signer);
      toast.success('Tokens withdrawn successfully!');
      loadListings();
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
          <h2 className="text-2xl font-bold">Properties DEX - Delisting</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <main className="container mx-auto px-4 py-6">
          <div className="max-w-5xl mx-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                <p className="mt-4 text-gray-400">Loading listings...</p>
              </div>
            ) : !signer ? (
              <div className="text-center py-12">
                <Lock className="w-16 h-16 text-primary-400 mx-auto mb-4" />
                <p className="text-xl font-medium text-white mb-4">Connect wallet to view and manage expired listings</p>
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-primary-400 mx-auto mb-4" />
                <p className="text-xl font-medium text-white mb-2">No expired listings available</p>
                <p className="text-gray-400">When your listings expire, they will appear here for management</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="bg-white/5 rounded-lg overflow-hidden border border-white/10 hover:border-primary-500/50 transition-all"
                  >
                    {listing.imageUrl && (
                      <img src={listing.imageUrl} alt={listing.token.name} className="w-full h-48 object-cover" />
                    )}
                    <div className="p-4 space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold">{listing.token.name}</h3>
                        <p className="text-sm text-gray-400">{listing.token.symbol}</p>
                      </div>
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
                          <span className="text-gray-400">Status:</span>
                          <span className="text-yellow-400">Expired</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">End Time:</span>
                          <span>{new Date(listing.endTime * 1000).toLocaleString()}</span>
                        </div>
                      </div>
                      {listing.isOwner && (
                        <button
                          onClick={() => handleCancel(listing.id)}
                          className="w-full bg-red-600 hover:bg-red-700 rounded-lg py-2 flex items-center justify-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Withdraw Tokens</span>
                        </button>
                      )}
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
      </motion.div>
    </motion.div>
  );
}