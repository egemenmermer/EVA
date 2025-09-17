import React from 'react';
import { useStore } from '@/store/useStore';
import { Slider } from '@/components/ui/Slider';
import { Thermometer } from 'lucide-react';

export const TemperatureControl: React.FC = () => {
  const { temperature, setTemperature } = useStore();
  
  const handleTemperatureChange = (value: number[]) => {
    // The slider returns an array, we take the first value
    setTemperature(value[0]);
  };
  
  // Format the temperature to 2 decimal places
  const formattedTemperature = temperature.toFixed(2);
  
  // Calculate color based on temperature (blue for cold, red for hot)
  const getTemperatureColor = () => {
    if (temperature < 0.3) return 'text-blue-500';
    if (temperature < 0.7) return 'text-green-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col space-y-2 p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Thermometer className={`h-5 w-5 ${getTemperatureColor()}`} />
          <span className="text-sm font-medium">Temperature</span>
        </div>
        <span className={`text-sm font-bold ${getTemperatureColor()}`}>
          {formattedTemperature}
        </span>
      </div>
      
      <Slider
        defaultValue={[temperature]}
        min={0}
        max={1}
        step={0.01}
        onValueChange={handleTemperatureChange}
        className="w-full"
        aria-label="Temperature"
      />
      
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
        <span>Predictable</span>
        <span>Creative</span>
      </div>
    </div>
  );
}; 