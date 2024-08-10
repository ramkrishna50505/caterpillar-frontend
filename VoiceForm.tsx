import React, { useState, useEffect, useRef } from 'react';
import useSpeechRecognition from './useSpeechRecognition';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';

interface FormData {
  tirePressureLeftFront: string;
  tirePressureRightFront: string;
  tireConditionLeftFront: string;
  tireConditionRightFront: string;
  tirePressureLeftRear: string;
  tirePressureRightRear: string;
  tireConditionLeftRear: string;
  tireConditionRightRear: string;
  overallTireSummary: string;
}

const tireConditionOptions = ['Good', 'Ok', 'Needs Replacement'];

const VoiceForm: React.FC = () => {
  const [activeField, setActiveField] = useState<keyof FormData>('tirePressureLeftFront');
  const [formData, setFormData] = useState<FormData>({
    tirePressureLeftFront: '',
    tirePressureRightFront: '',
    tireConditionLeftFront: '',
    tireConditionRightFront: '',
    tirePressureLeftRear: '',
    tirePressureRightRear: '',
    tireConditionLeftRear: '',
    tireConditionRightRear: '',
    overallTireSummary: '',
  });
  const [error, setError] = useState<string | null>(null);
  const { transcript, startListening, stopListening } = useSpeechRecognition();
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [recentPhoto, setRecentPhoto] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => {
    const lowerTranscript = transcript.toLowerCase();
    if (lowerTranscript.includes('next')) {
      handleNextField();
    } else if (lowerTranscript.includes('submit')) {
      handleSubmit();
    } else if (lowerTranscript.includes('capture photo') || lowerTranscript.includes('take picture')) {
      handleCapture();
    } else if (lowerTranscript.includes('take photo')) {
      takePhoto();
    } else if (lowerTranscript.includes('keep photo')) {
      keepPhoto();
    } else if (lowerTranscript.includes('discard photo')) {
      discardPhoto();
    } else if (lowerTranscript.includes('close camera')) {
      handleCloseCamera();
    } else {
      if (activeField.startsWith('tireCondition')) {
        const selectedOption = tireConditionOptions.find(option => 
          lowerTranscript.includes(option.toLowerCase())
        );
        if (selectedOption) {
          setFormData(prev => ({ ...prev, [activeField]: selectedOption }));
        }
      } else {
        setFormData(prev => ({ ...prev, [activeField]: transcript }));
      }
    }
  }, [transcript]);

  const handleNextField = () => {
    if (formData[activeField].trim() === '') {
      setError(`Please fill in the ${activeField} field before moving to the next.`);
      return;
    }

    setError(null);
    const fields = Object.keys(formData) as (keyof FormData)[];
    const currentIndex = fields.indexOf(activeField);
    const nextIndex = (currentIndex + 1) % fields.length;
    setActiveField(fields[nextIndex]);
  };

  const handleSubmit = async () => {
    try {
      const tiresData = {
        left_front_pressure: parseFloat(formData.tirePressureLeftFront),
        right_front_pressure: parseFloat(formData.tirePressureRightFront),
        left_front_condition: formData.tireConditionLeftFront,
        right_front_condition: formData.tireConditionRightFront,
        left_rear_pressure: parseFloat(formData.tirePressureLeftRear),
        right_rear_pressure: parseFloat(formData.tirePressureRightRear),
        left_rear_condition: formData.tireConditionLeftRear,
        right_rear_condition: formData.tireConditionRightRear,
        overall_summary: formData.overallTireSummary.trim()
      };
  
      const formDataToSend = new FormData();
      formDataToSend.append('tires_data', JSON.stringify(tiresData));
      
      imagePaths.forEach((imagePath, index) => {
        formDataToSend.append('images', dataURItoBlob(imagePath), `image_${index}.jpg`);
      });
  
      const response = await fetch('http://localhost:8000/inspection/7/set-tires', {
        method: 'POST',
        body: formDataToSend,
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error details:', errorData);
        throw new Error(errorData.detail || 'Failed to submit tire data');
      }
  
      const result = await response.json();
      console.log('Tire data submitted successfully:', result);
      
      // Clear the form and any errors
      setFormData({
        tirePressureLeftFront: '',
        tirePressureRightFront: '',
        tireConditionLeftFront: '',
        tireConditionRightFront: '',
        tirePressureLeftRear: '',
        tirePressureRightRear: '',
        tireConditionLeftRear: '',
        tireConditionRightRear: '',
        overallTireSummary: ''
      });
      setImagePaths([]);
      setError(null);
      
      // Provide audio feedback
      const utterance = new SpeechSynthesisUtterance("Form submitted successfully");
      window.speechSynthesis.speak(utterance);
  
    } catch (error: any) {
      console.error('Error submitting tire data:', error);
      setError(error.message || 'Failed to submit tire data. Please try again.');
      
      // Provide audio feedback for error
      const utterance = new SpeechSynthesisUtterance("Error submitting form. Please try again.");
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();  // Ensure video starts playing
      }
      setIsCameraOpen(true);
      // Provide audio feedback
      const utterance = new SpeechSynthesisUtterance("Camera opened. Say 'take photo' to capture.");
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Failed to access camera. Please ensure you've granted camera permissions.");
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 640, 480);
        const imagePath = canvasRef.current.toDataURL('image/jpeg');
        setRecentPhoto(imagePath);
        
        // Provide audio feedback
        const utterance = new SpeechSynthesisUtterance("Photo captured. Say 'keep photo' to save, 'discard photo' to try again, or 'close camera' to exit.");
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const keepPhoto = () => {
    if (recentPhoto) {
      setImagePaths(prevPaths => [...prevPaths, recentPhoto]);
      setRecentPhoto(null);
      
      // Provide audio feedback
      const utterance = new SpeechSynthesisUtterance("Photo saved. Camera closed.");
      window.speechSynthesis.speak(utterance);
      
      handleCloseCamera();
    } else {
      // Provide audio feedback if there's no recent photo
      const utterance = new SpeechSynthesisUtterance("No recent photo to save. Please take a photo first.");
      window.speechSynthesis.speak(utterance);
    }
  };

  const discardPhoto = () => {
    if (recentPhoto) {
      setRecentPhoto(null);
      // Provide audio feedback
      const utterance = new SpeechSynthesisUtterance("Photo discarded. You can take another photo.");
      window.speechSynthesis.speak(utterance);
    } else {
      // Provide audio feedback if there's no recent photo
      const utterance = new SpeechSynthesisUtterance("No recent photo to discard. Please take a photo first.");
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCloseCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setRecentPhoto(null);
    
    // Provide audio feedback
    const utterance = new SpeechSynthesisUtterance("Camera closed.");
    window.speechSynthesis.speak(utterance);
  };

  const renderField = (field: keyof FormData) => {
    if (field.startsWith('tireCondition')) {
      return (
        <FormControl component="fieldset">
          <FormLabel component="legend">{field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</FormLabel>
          <RadioGroup
            aria-label={field}
            name={field}
            value={formData[field]}
            onChange={handleChange(field)}
          >
            {tireConditionOptions.map(option => (
              <FormControlLabel key={option} value={option} control={<Radio />} label={option} />
            ))}
          </RadioGroup>
        </FormControl>
      );
    }

    return (
      <TextField
        label={field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
        variant="outlined"
        value={formData[field]}
        onChange={handleChange(field)}
        onFocus={() => setActiveField(field)}
        multiline={field === 'overallTireSummary'}
        rows={field === 'overallTireSummary' ? 4 : 1}
        inputProps={field === 'overallTireSummary' ? { maxLength: 1000 } : {}}
        focused={field === activeField}
        error={formData[field].trim() === ''}
        helperText={formData[field].trim() === '' ? 'This field is required' : ''}
      />
    );
  };

  // Helper function to convert data URI to Blob
  const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  return (
    <Box component="form" sx={{ '& .MuiTextField-root, & .MuiFormControl-root': { m: 1, width: '25ch' } }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {Object.keys(formData).map((field) => (
        <Box key={field}>
          {renderField(field as keyof FormData)}
        </Box>
      ))}
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={startListening} sx={{ mr: 1 }}>
          Start Voice Input
        </Button>
        <Button variant="contained" onClick={stopListening} sx={{ mr: 1 }}>
          Stop Voice Input
        </Button>
        <Button variant="contained" onClick={handleNextField} sx={{ mr: 1 }}>
          Next Field
        </Button>
        <Button variant="contained" onClick={handleSubmit} sx={{ mr: 1 }}>
          Submit
        </Button>
        <Button variant="contained" onClick={handleCapture} sx={{ mr: 1 }}>
          Open Camera
        </Button>
      </Box>
      <Typography variant="body1" sx={{ mt: 2 }}>
        Photos captured: {imagePaths.length}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>
        Voice commands: "Next" for next field, "Submit" to submit form, "Capture photo" to open camera, 
        "Take photo" to capture a photo, "Keep photo" to save the photo, "Discard photo" to try again, 
        "Close camera" to exit camera mode
      </Typography>
      
      <Modal
        open={isCameraOpen}
        onClose={handleCloseCamera}
        aria-labelledby="camera-preview-modal"
        aria-describedby="camera-preview-description"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          border: '2px solid #000',
          boxShadow: 24,
          p: 4,
          width: '80%',
          maxWidth: '640px',
        }}>
          <Typography id="camera-preview-modal" variant="h6" component="h2">
            Camera Preview
          </Typography>
          {recentPhoto ? (
            <Box sx={{ width: '100%', paddingTop: '75%', position: 'relative' }}>
              <img 
                src={recentPhoto} 
                alt="Recent capture"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </Box>
          ) : (
            <Box sx={{ position: 'relative', width: '100%', paddingTop: '75%', overflow: 'hidden' }}>
              <video 
                ref={videoRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                }}
                autoPlay 
                playsInline
              />
            </Box>
          )}
          {recentPhoto ? (
            <>
              <Button variant="contained" onClick={keepPhoto} sx={{ mt: 2, mr: 1 }}>
                Keep Photo
              </Button>
              <Button variant="contained" onClick={discardPhoto} sx={{ mt: 2, mr: 1 }}>
                Discard Photo
              </Button>
            </>
          ) : (
            <Button variant="contained" onClick={takePhoto} sx={{ mt: 2, mr: 1 }}>
              Take Photo
            </Button>
          )}
          <Button variant="contained" onClick={handleCloseCamera} sx={{ mt: 2 }}>
            Close Camera
          </Button>
        </Box>
      </Modal>

      <canvas ref={canvasRef} style={{ display: 'none' }} width="640" height="480" />
    </Box>
  );
};

export default VoiceForm;