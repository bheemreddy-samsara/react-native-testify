import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {Avatar, Badge, Button, Card} from '../components';

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  joinedDate: string;
}

export interface ProfileScreenProps {
  user?: UserProfile | null;
  loading?: boolean;
  error?: string | null;
  onEdit?: () => void;
  onLogout?: () => void;
}

export function ProfileScreen({
  user,
  loading = false,
  error = null,
  onEdit,
  onLogout,
}: ProfileScreenProps) {
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Button title="Try Again" variant="primary" onPress={onEdit} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No Profile</Text>
        <Text style={styles.emptyMessage}>Please log in to view your profile</Text>
        <Button title="Log In" variant="primary" onPress={onEdit} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar name={user.name} size="large" />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Badge
            label={user.isActive ? 'Active' : 'Inactive'}
            variant={user.isActive ? 'success' : 'warning'}
          />
        </View>
      </View>

      <Card title="Account Details" subtitle={`Member since ${user.joinedDate}`}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Role</Text>
          <Text style={styles.detailValue}>{user.role}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{user.email}</Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button title="Edit Profile" variant="primary" onPress={onEdit} />
        <View style={styles.actionSpacer} />
        <Button title="Log Out" variant="danger" onPress={onLogout} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  actions: {
    padding: 20,
  },
  actionSpacer: {
    height: 12,
  },
});
