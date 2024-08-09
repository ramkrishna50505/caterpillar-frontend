import React, { useState, useEffect } from 'react';
import useSpeechRecognition from './useSpeechRecognition';

interface FormData {
  name: string;
  email: string;
  message: string;
}

const VoiceForm: React.FC = () => {
  const [activeField, setActiveField] = useState<keyof FormData>('name');
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', message: '' });
  const { transcript, startListening, stopListening } = useSpeechRecognition();

  useEffect(() => {
    if (transcript.toLowerCase().includes('next')) {
      handleNextField();
    } else if (transcript.toLowerCase().includes('submit')) {
      handleSubmit();
    } else {
      setFormData(prev => ({ ...prev, [activeField]: transcript }));
    }
  }, [transcript]);

  const handleNextField = () => {
    const fields: (keyof FormData)[] = ['name', 'email', 'message'];
    const currentIndex = fields.indexOf(activeField);
    const nextIndex = (currentIndex + 1) % fields.length;
    setActiveField(fields[nextIndex]);
  };

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
    // Implement your form submission logic here
  };

  return (
    <form>
      <div>
        <label htmlFor="name">Name:</label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          onFocus={() => setActiveField('name')}
        />
      </div>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          onFocus={() => setActiveField('email')}
        />
      </div>
      <div>
        <label htmlFor="message">Message:</label>
        <textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
          onFocus={() => setActiveField('message')}
        ></textarea>
      </div>
      <button type="button" onClick={startListening}>Start Voice Input</button>
      <button type="button" onClick={stopListening}>Stop Voice Input</button>
    </form>
  );
};

export default VoiceForm;