pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = 'vcall-app'
        CONTAINER_NAME = 'vcall-app'
        EXTERNAL_NETWORK = 'tunnel'  // Your external network name
    }
    
    stages {
        stage('Build') {
            steps {
                script {
                    // Build Docker image
                    sh 'docker compose build'
                }
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    // Stop and remove existing container
                    sh 'docker compose down || true'
                    
                    // Start new container
                    sh 'docker compose up -d'
                    
                    // Connect to external network
                    sh '''
                        # Create network if it doesn't exist
                        docker network create ${EXTERNAL_NETWORK} || true
                        
                        # Connect container to network
                        docker network connect ${EXTERNAL_NETWORK} ${CONTAINER_NAME} || true
                    '''
                }
            }
        }
        
        stage('Health Check') {
            steps {
                script {
                    sh '''
                        max_attempts=30
                        attempt=1
                        until curl -s http://localhost:8008 > /dev/null || [ $attempt -eq $max_attempts ]; do
                            echo "Waiting for application to be available... (Attempt: $attempt)"
                            sleep 10
                            attempt=$((attempt + 1))
                        done
                        
                        if [ $attempt -eq $max_attempts ]; then
                            echo "Application failed to start"
                            exit 1
                        fi
                        
                        echo "Application is up and running"
                    '''
                }
            }
        }
    }
    
    post {
        failure {
            script {
                // Cleanup on failure
                sh '''
                    docker network disconnect ${EXTERNAL_NETWORK} ${CONTAINER_NAME} || true
                    docker compose down || true
                '''
                
                emailext (
                    subject: "Pipeline Failed: ${currentBuild.fullDisplayName}",
                    body: "Pipeline failed for ${env.BUILD_URL}",
                    to: 'adityaprasetyakusnadi@gmail.com'
                )
            }
        }
        success {
            echo "Deployment successful! Container is connected to ${EXTERNAL_NETWORK}"
        }
    }
}
