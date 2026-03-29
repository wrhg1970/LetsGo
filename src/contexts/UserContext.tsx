import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, CustomRole } from '../types';

interface UserContextType {
  user: User | null;
  role: CustomRole | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<CustomRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (firebaseUser: any) => {
    if (!firebaseUser) {
      setUser(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      // 1. Try to find user by email (for pre-registered users)
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', firebaseUser.email));
      const querySnapshot = await getDocs(q);
      
      let userData: User | null = null;
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        userData = docSnap.data() as User;
        
        // Ensure wrhg1970@gmail.com is always admin
        if (userData.email === 'wrhg1970@gmail.com' && userData.role !== 'admin') {
          userData.role = 'admin';
          await setDoc(doc(db, 'users', docSnap.id), { role: 'admin' }, { merge: true });
        }
        
        // If it was a pre-registered user, update their UID to the real one
        if (userData.isPreRegistered) {
          const oldId = docSnap.id;
          const updatedUser = { ...userData, uid: firebaseUser.uid, isPreRegistered: false };
          await setDoc(doc(db, 'users', firebaseUser.uid), updatedUser);
          if (oldId !== firebaseUser.uid) {
            await deleteDoc(doc(db, 'users', oldId));
          }
          userData = updatedUser;
        }
      } else {
        // New user, create default
        userData = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Usuario',
          email: firebaseUser.email || '',
          role: firebaseUser.email === 'wrhg1970@gmail.com' ? 'admin' : 'agent' // Default role ID
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      }

      setUser(userData);

      // 2. Fetch Role Permissions
      if (userData.role) {
        const roleDoc = await getDoc(doc(db, 'roles', userData.role));
        if (roleDoc.exists()) {
          setRole(roleDoc.data() as CustomRole);
        } else if (userData.role === 'admin') {
          // Fallback for admin if role doc doesn't exist yet
          setRole({
            id: 'admin',
            name: 'Administrador',
            description: 'Acceso total',
            permissions: {} // Will be handled by isAdmin check
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Automatic login: bypass Firebase Auth and set a default admin user
    const mockFirebaseUser = {
      uid: 'system-admin-uid',
      email: 'wrhg1970@gmail.com',
      displayName: 'Administrador del Sistema'
    };
    
    fetchUserData(mockFirebaseUser);
    
    // We don't need onAuthStateChanged for automatic login
    /*
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      fetchUserData(firebaseUser);
    });

    return () => unsubscribe();
    */
  }, []);

  const refreshUser = async () => {
    if (auth.currentUser) {
      await fetchUserData(auth.currentUser);
    }
  };

  return (
    <UserContext.Provider value={{ user, role, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
