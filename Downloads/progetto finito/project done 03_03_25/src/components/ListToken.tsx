import React, { useState, useEffect } from 'react'; // Aggiunto useEffect
import { motion } from 'framer-motion';
import { X, Info } from 'lucide-react';
import { ethers } from 'ethers';
import { listPropertyToken } from '../lib/web3';
import toast from 'react-hot-toast';

interface ListTokenProps {
  onClose: () => void;
  signer: ethers.Signer;
  onSuccess: () => void;
  initialTokenAddress?: string | null; // Aggiunto initialTokenAddress
}

export default function ListToken({ onClose, signer, onSuccess, initialTokenAddress }: ListTokenProps) {
  const [formData, setFormData] = useState({
    tokenAddress: initialTokenAddress || '', // Precompila con initialTokenAddress
    amount: '',
    pricePerShare: '',
    useUSDC: false,
    projectWebsite: '',
    socialMediaLink: '',
    imageUrl: '',
    telegramUrl: '',
    projectDescription: '',
    useReferral: false,
    referralPercent: '5',
    duration: '604800' // Default a 7 giorni
  });

  // Aggiunto useEffect per aggiornare tokenAddress se initialTokenAddress cambia
  useEffect(() => {
    if (initialTokenAddress) {
      setFormData(prev => ({ ...prev, tokenAddress: initialTokenAddress }));
    }
  }, [initialTokenAddress]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const setReferralPercent = (percent: string) => {
    setFormData((prev) => ({
      ...prev,
      referralPercent: percent
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validazioni base
      if (!ethers.isAddress(formData.tokenAddress)) throw new Error('Invalid token address');
      if (parseFloat(formData.amount) <= 0) throw new Error('Amount must be greater than 0');
      if (parseFloat(formData.pricePerShare) < 0.00001) throw new Error('Price must be at least 0.00001');
      if (formData.useReferral) {
        const referralPercentNum = parseInt(formData.referralPercent);
        if (isNaN(referralPercentNum) || referralPercentNum <= 0 || referralPercentNum > 100) {
          throw new Error('Referral percentage must be between 1 and 100');
        }
      }

      // Validazione decimali
      const priceDecimals = formData.useUSDC ? 6 : 18;
      const amountDecimalsMatch = formData.amount.match(/\d+\.(\d+)/);
      const priceDecimalsMatch = formData.pricePerShare.match(/\d+\.(\d+)/);
      if (amountDecimalsMatch && amountDecimalsMatch[1].length > 18) throw new Error('Amount exceeds 18 decimals');
      if (priceDecimalsMatch && priceDecimalsMatch[1].length > priceDecimals) throw new Error(`Price exceeds ${priceDecimals} decimals`);

      // Validazione limiti metadati (in caratteri, approssimazione byte)
      if (formData.projectWebsite.length > 256) throw new Error('Project website URL must be 256 characters or less');
      if (formData.socialMediaLink.length > 256) throw new Error('Twitter URL must be 256 characters or less');
      if (formData.imageUrl.length > 256) throw new Error('Image URL must be 256 characters or less');
      if (formData.telegramUrl.length > 256) throw new Error('Telegram URL must be 256 characters or less');
      if (formData.projectDescription.length > 1024) throw new Error('Project description must be 1024 characters or less');

      toast.loading('Listing token...', { id: 'list-token' });

      const receipt = await listPropertyToken(
        formData.tokenAddress,
        formData.amount,
        formData.pricePerShare,
        formData.useUSDC,
        formData.projectWebsite,
        formData.socialMediaLink,
        formData.imageUrl,
        formData.telegramUrl,
        formData.projectDescription,
        signer,
        formData.useReferral,
        parseInt(formData.referralPercent),
        parseInt(formData.duration)
      );

      console.log('Listing receipt:', receipt);
      toast.success('Token listed successfully!', { id: 'list-token' });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Listing error details:', {
        message: error.message,
        reason: error.reason,
        data: error.data,
        code: error.code
      });
      toast.error(error.message, { id: 'list-token' });
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
          <h2 className="text-2xl font-bold">List Property Token</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-yellow-500/10 p-4 rounded-lg mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-yellow-200 mt-1 flex-shrink-0" />
            <div>
              <p className="text-yellow-200 font-medium">Minimum Values</p>
              <p className="text-yellow-200/80 text-sm">
                Price per share must be at least 0.00001 {formData.useUSDC ? 'USDC' : 'PRDX (default)'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Token Address</label>
            <input
              type="text"
              name="tokenAddress"
              value={formData.tokenAddress}
              onChange={handleChange}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              placeholder="0x..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Amount to List</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0.00001"
                step="0.00001"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Amount of tokens"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Price per Share</label>
              <input
                type="number"
                name="pricePerShare"
                value={formData.pricePerShare}
                onChange={handleChange}
                required
                min="0.00001"
                step="0.00001"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Price per token"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Listing Duration</label>
            <select
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              className="w-full bg-gray-600 text-white border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
              required
            >
              <option value="600">10 Minutes</option>
              <option value="604800">7 Days</option>
              <option value="1296000">15 Days</option>
              <option value="3888000">45 Days</option>
              <option value="5184000">60 Days</option>
            </select>
            <style jsx>{`
              select[name="duration"] {
                background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23ffffff' viewBox='0 0 16 16'%3E%3Cpath d='M7 10l-5-5 1.41-1.41L7 7.17l4.59-4.58L13 5l-6 6z'/%3E%3C/svg%3E") no-repeat right 0.75rem center/12px 12px;
                padding-right: 2rem;
              }
              select[name="duration"]:focus {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%234590d5' viewBox='0 0 16 16'%3E%3Cpath d='M7 10l-5-5 1.41-1.41L7 7.17l4.59-4.58L13 5l-6 6z'/%3E%3C/svg%3E");
              }
            `}</style>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="useUSDC"
              id="useUSDC"
              checked={formData.useUSDC}
              onChange={handleChange}
              className="rounded border-white/10 bg-white/5"
            />
            <label htmlFor="useUSDC" className="text-sm font-medium text-gray-300">
              Use USDC for payment (default is PRDX)
            </label>
          </div>

          <div className="bg-primary-900/30 p-4 rounded-lg border border-primary-700/50">
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                name="useReferral"
                id="useReferral"
                checked={formData.useReferral}
                onChange={handleChange}
                className="rounded border-white/10 bg-white/5"
              />
              <label htmlFor="useReferral" className="text-sm font-medium text-primary-300">
                Enable Referral System
              </label>
            </div>

            {formData.useReferral && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Referral Percentage (1-100%)
                </label>
                <input
                  type="number"
                  name="referralPercent"
                  value={formData.referralPercent}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white mb-2"
                  placeholder="Referral percentage"
                />
                <div className="flex space-x-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setReferralPercent('1')}
                    className="bg-primary-800/50 hover:bg-primary-700/50 px-3 py-1 rounded text-sm"
                  >
                    1%
                  </button>
                  <button
                    type="button"
                    onClick={() => setReferralPercent('5')}
                    className="bg-primary-800/50 hover:bg-primary-700/50 px-3 py-1 rounded text-sm"
                  >
                    5%
                  </button>
                  <button
                    type="button"
                    onClick={() => setReferralPercent('10')}
                    className="bg-primary-800/50 hover:bg-primary-700/50 px-3 py-1 rounded text-sm"
                  >
                    10%
                  </button>
                </div>
                <p className="text-xs text-primary-300 mt-2">
                  Buyers can provide a referral code to receive this percentage of the purchase amount. The tokens for referrals will be deducted from your listing total.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Project Description</label>
            <textarea
              name="projectDescription"
              value={formData.projectDescription}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              placeholder="Describe your property token..."
              rows={4}
              maxLength={1024}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Token Image URL</label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              placeholder="https://example.com/image.jpg"
              maxLength={256}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Project Website</label>
            <input
              type="url"
              name="projectWebsite"
              value={formData.projectWebsite}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              placeholder="https://example.com"
              maxLength={256}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Twitter URL</label>
              <input
                type="url"
                name="socialMediaLink"
                value={formData.socialMediaLink}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="https://twitter.com/example"
                maxLength={256}
            />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Telegram URL</label>
              <input
                type="url"
                name="telegramUrl"
                value={formData.telegramUrl}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="https://t.me/example"
                maxLength={256}
              />
            </div>
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
              List Token
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}