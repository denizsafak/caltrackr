import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

export function LoadingScreen() {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const footerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, animatedStyle]}>
        <Image 
          source={require('@/assets/images/icon.png')} 
          style={styles.logo} 
          resizeMode="contain"
        />
      </Animated.View>
      <View style={styles.footer}>
        <Animated.View style={footerStyle}>
           <View style={styles.loaderBar}>
              <AnimatedLoader />
           </View>
        </Animated.View>
      </View>
    </View>
  );
}

function AnimatedLoader() {
    const progress = useSharedValue(0);
    
    useEffect(() => {
        progress.value = withRepeat(
            withTiming(1, { duration: 2000, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        left: `${progress.value * 100}%`,
        width: '30%',
    }));

    return (
        <View style={styles.loaderTrack}>
            <Animated.View style={[styles.loaderFill, style]} />
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 30,
  },
  footer: {
    position: 'absolute',
    bottom: 80,
    width: '60%',
  },
  loaderBar: {
    height: 4,
    width: '100%',
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loaderTrack: {
    flex: 1,
    position: 'relative',
  },
  loaderFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  }
});
