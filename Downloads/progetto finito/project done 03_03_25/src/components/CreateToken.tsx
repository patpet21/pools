import React, { useState } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { X, Info } from 'lucide-react';

interface CreateTokenProps {
  onClose: () => void;
  onSuccess: (tokenAddress: string) => void; // Modificato per passare tokenAddress
  signer: ethers.Signer;
}

export default function CreateToken({ onClose, onSuccess, signer }: CreateTokenProps) {
  const [formData, setFormData] = useState({
    tokenName: '',
    tokenSymbol: '',
    initialSupply: '',
    imageLink: '',
    projectDesc: '',
    websiteLink: '',
    twitterLink: '',
    telegramLink: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const factoryAddress = '0x01A3ad1acc738cb60d48E08ccadC769904De256c';
      const factoryABI = [
        "function createToken(string tokenName, string tokenSymbol, uint256 initialSupply, string imageLink, string projectDesc, string websiteLink, string twitterLink, string telegramLink) external returns (tuple(address tokenAddress, string name, string symbol, uint256 initialSupply, address creator, string imageUrl, string projectDescription, string websiteUrl, string twitterUrl, string telegramUrl))"
      ];

      const factory = new ethers.Contract(factoryAddress, factoryABI, signer);
      
      const tx = await factory.createToken(
        formData.tokenName,
        formData.tokenSymbol,
        formData.initialSupply,
        formData.imageLink,
        formData.projectDesc,
        formData.websiteLink,
        formData.twitterLink,
        formData.telegramLink
      );

      toast.loading('Creating token...', { id: 'create-token' });
      const receipt = await tx.wait();
      
      // Get token address from event logs
      const tokenAddress = receipt.logs[0].address;
      
      // Add token to MetaMask
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed or not available.');
      }

      try {
        const wasAdded = await window.ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: tokenAddress,
              symbol: formData.tokenSymbol,
              decimals: 18, // Corretto per PropertiesDEXToken
              image: formData.imageLink,
            },
          },
        });

        if (wasAdded) {
          console.log('Token successfully added to MetaMask');
        } else {
          console.warn('User rejected the request to add token to MetaMask');
        }
      } catch (error) {
        console.error('Error adding token to MetaMask:', error);
        toast.warn('Failed to add token to MetaMask automatically. You can add it manually.', { id: 'metamask-error' });
      }

      toast.success('Token created successfully!', { id: 'create-token' });
      onClose();
      onSuccess(tokenAddress); // Passa l'indirizzo del token a onSuccess
    } catch (error: any) {
      console.error('Error creating token:', error);
      toast.error(error.message || 'Failed to create token', { id: 'create-token' });
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
        className="bg-white/10 backdrop-blur rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Create Property Token</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-yellow-500/10 p-4 rounded-lg mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-yellow-200 mt-1 flex-shrink-0" />
            <div>
              <p className="text-yellow-200 font-medium">Token Creation Fees</p>
              <p className="text-yellow-200/80 text-sm">Base Gas Fee: Variable (typically 0.001-0.003 ETH)</p>
              <p className="text-yellow-200/80 text-sm">Platform Fee: 0.1% of total token supply</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token Name
              </label>
              <input
                type="text"
                name="tokenName"
                value={formData.tokenName}
                onChange={handleChange}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Luxury Villa Token"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token Symbol
              </label>
              <input
                type="text"
                name="tokenSymbol"
                value={formData.tokenSymbol}
                onChange={handleChange}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., LVT"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Initial Supply
            </label>
            <input
              type="number"
              name="initialSupply"
              value={formData.initialSupply}
              onChange={handleChange}
              required
              min="1"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., 1000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Property Image URL
            </label>
            <input
              type="url"
              name="imageLink"
              value={formData.imageLink}
              onChange={handleChange}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Description
            </label>
            <textarea
              name="projectDesc"
              value={formData.projectDesc}
              onChange={handleChange}
              required
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Describe your property..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Website URL
              </label>
              <input
                type="url"
                name="websiteLink"
                value={formData.websiteLink}
                onChange={handleChange}
                className="w/full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Twitter URL
              </label>
              <input
                type="url"
                name="twitterLink"
                value={formData.twitterLink}
                onChange={handleChange}
                className="w/full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://twitter.com/example"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Telegram URL
            </label>
            <input
              type="url"
              name="telegramLink"
              value={formData.telegramLink}
              onChange={handleChange}
              className="w/full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://t.me/example"
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 transition-colors"
            >
              Create Token
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}