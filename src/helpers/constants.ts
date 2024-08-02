export const reply_start_admin = {
  reply_markup: {
    inline_keyboard: [
      [{ text: 'График дежурств', callback_data: 'schedule_duty' }],
      [{ text: 'Редактировать дежурства', callback_data: 'edit_duty' }],
    ],
  },
};

export const reply_start_manager = {
  reply_markup: {
    inline_keyboard: [
      [{ text: 'Мои дежурства', callback_data: 'schedule_duty' }],
    ],
  },
};
