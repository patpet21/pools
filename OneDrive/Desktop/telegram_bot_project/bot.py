import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Updater, CommandHandler, CallbackQueryHandler, CallbackContext
import logging
import time
from threading import Thread

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

user_rewards = {}

# Funzione per inizializzare l'utente
def initialize_user(user_id):
    if user_id not in user_rewards:
        user_rewards[user_id] = {'tap': 0, 'farm': 0, 'last_tap': 0, 'referrals': 0}

# Funzione per il comando start
def start(update: Update, context: CallbackContext) -> None:
    user_id = update.message.from_user.id
    initialize_user(user_id)

    keyboard = [
        [InlineKeyboardButton("🔴 Tap", callback_data='tap')],
        [InlineKeyboardButton("📝 Tasks", callback_data='tasks')],
        [InlineKeyboardButton("🌾 Farm", callback_data='farm')],
        [InlineKeyboardButton("👥 Invite Friends", callback_data='invite_friends')],
        [InlineKeyboardButton("📊 Stats", callback_data='stats')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    update.message.reply_text('Welcome! Select a section:', reply_markup=reply_markup)

# Funzione per gestire i comandi tap con immagine interattiva
def tap(update: Update, context: CallbackContext) -> None:
    query = update.callback_query
    query.answer()
    user_id = query.from_user.id
    current_time = time.time()

    if current_time - user_rewards[user_id]['last_tap'] >= 4 * 3600:
        user_rewards[user_id]['tap'] += 100
        user_rewards[user_id]['last_tap'] = current_time
        message = f'You earned 100 $MXA! Total: {user_rewards[user_id]["tap"]} $MXA'
    else:
        message = 'You need to wait 4 hours between taps.'

    keyboard = [
        [InlineKeyboardButton("🔴 Tap", callback_data='tap')],
        [InlineKeyboardButton("📝 Tasks", callback_data='tasks')],
        [InlineKeyboardButton("🌾 Farm", callback_data='farm')],
        [InlineKeyboardButton("👥 Invite Friends", callback_data='invite_friends')],
        [InlineKeyboardButton("📊 Stats", callback_data='stats')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    query.edit_message_text(text=message, reply_markup=reply_markup)

# Funzione per gestire la sezione tasks
def tasks(update: Update, context: CallbackContext) -> None:
    query = update.callback_query
    query.answer()

    tasks_text = """
    Complete missions to earn rewards:
    1. Register at www.metalandspaceapp.xyz: 10,000 CEXP
    2. Follow us on YouTube
    3. Invite 5 friends: 15,000 $MXA
    4. Invite 10 friends: 25,000 $MXA
    """

    keyboard = [
        [InlineKeyboardButton("🔴 Tap", callback_data='tap')],
        [InlineKeyboardButton("📝 Tasks", callback_data='tasks')],
        [InlineKeyboardButton("🌾 Farm", callback_data='farm')],
        [InlineKeyboardButton("👥 Invite Friends", callback_data='invite_friends')],
        [InlineKeyboardButton("📊 Stats", callback_data='stats')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    query.edit_message_text(text=tasks_text, reply_markup=reply_markup)

# Funzione per gestire la sezione farm
def farm(update: Update, context: CallbackContext) -> None:
    query = update.callback_query
    query.answer()
    user_id = query.from_user.id
    message = f'You earned {user_rewards[user_id]["farm"]} $MXA from your farm!'

    keyboard = [
        [InlineKeyboardButton("🔴 Tap", callback_data='tap')],
        [InlineKeyboardButton("📝 Tasks", callback_data='tasks')],
        [InlineKeyboardButton("🌾 Farm", callback_data='farm')],
        [InlineKeyboardButton("👥 Invite Friends", callback_data='invite_friends')],
        [InlineKeyboardButton("📊 Stats", callback_data='stats')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    query.edit_message_text(text=message, reply_markup=reply_markup)

# Funzione per gestire la sezione invite friends
def invite_friends(update: Update, context: CallbackContext) -> None:
    query = update.callback_query
    query.answer()
    user_id = query.from_user.id
    referral_link = f"https://t.me/mexa_game_airdrop_bot?start={user_id}"
    message = f'Invite your friends using your referral link: {referral_link}'

    keyboard = [
        [InlineKeyboardButton("🔴 Tap", callback_data='tap')],
        [InlineKeyboardButton("📝 Tasks", callback_data='tasks')],
        [InlineKeyboardButton("🌾 Farm", callback_data='farm')],
        [InlineKeyboardButton("👥 Invite Friends", callback_data='invite_friends')],
        [InlineKeyboardButton("📊 Stats", callback_data='stats')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    query.edit_message_text(text=message, reply_markup=reply_markup)

# Funzione per la produzione della farm
def farm_production():
    while True:
        for user_id in user_rewards:
            user_rewards[user_id]['farm'] += 0.01
        time.sleep(1)

# Funzione principale
def main():
    TOKEN = '7090490541:AAHtLJMImiXlXs5qguUg5iR2YclPSlYHaao'
    updater = Updater(TOKEN, use_context=True)

    dp = updater.dispatcher

    dp.add_handler(CommandHandler("start", start))
    dp.add_handler(CallbackQueryHandler(tap, pattern='tap'))
    dp.add_handler(CallbackQueryHandler(tasks, pattern='tasks'))
    dp.add_handler(CallbackQueryHandler(farm, pattern='farm'))
    dp.add_handler(CallbackQueryHandler(invite_friends, pattern='invite_friends'))

    Thread(target=farm_production, daemon=True).start()

    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main()
